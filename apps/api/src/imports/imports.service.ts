import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttachmentKind,
  ImportJobStatus,
  ImportJobType,
  InventoryStatus,
  Prisma,
  RoleName,
  TransactionType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import type { AuthUser } from '../common/types/auth-user.type';
import { getInventoryStatus } from '../common/utils/inventory-status.util';
import { PrismaService } from '../database/prisma.service';
import { MediaService } from '../media/media.service';
import { CommitImportDto, DirectImportDto, PreviewImportDto } from './dto/import.dto';
import { parseLegacyWorkbook } from './excel-legacy.parser';

type StoredMediaRef = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
};

type PreviewPayload = {
  summary: {
    inventoryCount: number;
    journalCount: number;
    errorCount: number;
    warningCount: number;
  };
  errors: string[];
  warnings: string[];
  inventoryRows: Array<{
    rowNumber: number;
    itemName: string;
    uom: string;
    openingQty: number;
    totalInQty: number;
    totalOutQty: number;
    currentQty: number;
    legacyStatus: string | null;
    images: StoredMediaRef[];
  }>;
  journalRows: Array<{
    rowNumber: number;
    date: string | null;
    itemName: string;
    projectName: string | null;
    photos: StoredMediaRef[];
    invoices: StoredMediaRef[];
  }>;
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async preview(
    file: Express.Multer.File | undefined,
    dto: PreviewImportDto,
    user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file Excel để import');
    }

    const importJob = await this.prisma.importJob.create({
      data: {
        type: dto.type ?? ImportJobType.LEGACY_BOOTSTRAP,
        status: ImportJobStatus.PREVIEW,
        fileName: file.originalname,
        createdById: user.id,
      },
    });

    const parsed = await parseLegacyWorkbook(file.buffer);
    const prefix = `imports/${importJob.id}`;

    const inventoryRows = await Promise.all(
      parsed.inventoryRows.map(async (row) => ({
        ...row,
        images: await Promise.all(
          row.images.map((image, index) =>
            this.mediaService.uploadBuffer(
              image.buffer,
              image.fileName || `inventory-${row.rowNumber}-${index + 1}.jpg`,
              `${prefix}/inventory`,
              image.mimeType,
            ),
          ),
        ),
      })),
    );

    const journalRows = await Promise.all(
      parsed.journalRows.map(async (row) => ({
        ...row,
        photos: await Promise.all(
          row.photos.map((image, index) =>
            this.mediaService.uploadBuffer(
              image.buffer,
              image.fileName || `photo-${row.rowNumber}-${index + 1}.jpg`,
              `${prefix}/journal-photos`,
              image.mimeType,
            ),
          ),
        ),
        invoices: await Promise.all(
          row.invoices.map((image, index) =>
            this.mediaService.uploadBuffer(
              image.buffer,
              image.fileName || `invoice-${row.rowNumber}-${index + 1}.jpg`,
              `${prefix}/journal-invoices`,
              image.mimeType,
            ),
          ),
        ),
      })),
    );

    const payload: PreviewPayload = {
      summary: {
        inventoryCount: inventoryRows.length,
        journalCount: journalRows.length,
        errorCount: parsed.errors.length,
        warningCount: parsed.warnings.length,
      },
      errors: parsed.errors,
      warnings: parsed.warnings,
      inventoryRows,
      journalRows,
    };

    await this.prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        previewSummary: payload as never,
        errorSummary:
          parsed.errors.length > 0
            ? ({
                errors: parsed.errors,
                warnings: parsed.warnings,
              } as never)
            : undefined,
      },
    });

    return {
      jobId: importJob.id,
      ...payload.summary,
      errors: payload.errors,
      warnings: payload.warnings,
      sampleInventory: payload.inventoryRows.slice(0, 10),
      sampleJournal: payload.journalRows.slice(0, 10),
    };
  }

  async commit(dto: CommitImportDto, user: AuthUser) {
    const importJob = await this.prisma.importJob.findUnique({
      where: { id: dto.jobId },
    });

    if (!importJob || !importJob.previewSummary) {
      throw new NotFoundException('Không tìm thấy job preview để commit');
    }

    if (importJob.status === ImportJobStatus.COMMITTED) {
      throw new BadRequestException('Job này đã được commit');
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException('Kho đích không tồn tại');
    }

    this.ensureUnitAccess(user, warehouse.unitId);

    const payload = importJob.previewSummary as unknown as PreviewPayload;
    const overwriteExisting = dto.overwriteExisting ?? true;

    return this.prisma.$transaction(
      async (tx) => {
        let importedItems = 0;
        let importedJournalRows = 0;

        // Caching maps to optimize execution speed
        const uomCache = new Map<string, any>();
        const itemCache = new Map<string, any>();
        const projectCache = new Map<string, any>();
        const inventoryCache = new Map<string, any>(); // itemId -> inventoryItem

        // List of item media to batch insert
        const itemMediaToInsert: any[] = [];

        // 1. Pre-fetch UOMs
        const uomCodes = Array.from(
          new Set([
            ...payload.inventoryRows.map((r) => r.uom.trim().toUpperCase()),
            'CÁI',
          ]),
        );
        const existingUoms = await tx.uom.findMany({
          where: { code: { in: uomCodes } },
        });
        for (const u of existingUoms) {
          uomCache.set(u.code, u);
        }

        // 2. Pre-fetch Items
        const itemNames = Array.from(
          new Set([
            ...payload.inventoryRows.map((r) => r.itemName.trim()),
            ...payload.journalRows.map((r) => r.itemName.trim()),
          ]),
        );
        const existingItems = await tx.item.findMany({
          where: { name: { in: itemNames } },
        });
        for (const item of existingItems) {
          const cacheKey = `${item.name.toLowerCase()}_${item.defaultUomId}`;
          itemCache.set(cacheKey, item);
        }

        // 3. Pre-fetch Projects
        const projectNames = Array.from(
          new Set(
            payload.journalRows
              .map((r) => r.projectName)
              .filter(Boolean) as string[],
          ),
        );
        if (projectNames.length > 0) {
          const existingProjects = await tx.project.findMany({
            where: {
              OR: [
                { name: { in: projectNames } },
                {
                  code: {
                    in: projectNames.map((p) =>
                      this.slugify(p),
                    ),
                  },
                },
              ],
            },
          });
          for (const p of existingProjects) {
            projectCache.set(p.name.toLowerCase(), p);
            projectCache.set(p.code.toLowerCase(), p);
          }
        }

        // 4. Pre-fetch Inventory Items for this warehouse
        const existingInventoryList = await tx.inventoryItem.findMany({
          where: { warehouseId: warehouse.id },
        });
        for (const inv of existingInventoryList) {
          inventoryCache.set(inv.itemId, inv);
        }

        for (const row of payload.inventoryRows) {
          const uom = await this.ensureUom(tx, row.uom, uomCache);
          const item = await this.ensureItem(tx, row.itemName, uom.id, itemCache);
          const existingInventory = inventoryCache.get(item.id);

          if (existingInventory && !overwriteExisting) {
            continue;
          }

          const minQty = existingInventory?.minQty ?? 5;
          const status = getInventoryStatus(row.currentQty, minQty);

          if (existingInventory) {
            await tx.inventoryItem.update({
              where: { id: existingInventory.id },
              data: {
                openingQty: row.openingQty,
                totalInQty: row.totalInQty,
                totalOutQty: row.totalOutQty,
                currentQty: row.currentQty,
                legacyStatus: row.legacyStatus,
                minQty,
                status,
                lastMovementAt: new Date(),
              },
            });
          } else {
            const newInv = await tx.inventoryItem.create({
              data: {
                itemId: item.id,
                warehouseId: warehouse.id,
                openingQty: row.openingQty,
                totalInQty: row.totalInQty,
                totalOutQty: row.totalOutQty,
                currentQty: row.currentQty,
                legacyStatus: row.legacyStatus,
                minQty,
                status,
                lastMovementAt: new Date(),
              },
            });
            inventoryCache.set(item.id, newInv);
          }

          for (const image of row.images) {
            itemMediaToInsert.push({
              itemId: item.id,
              uploadedById: user.id,
              storageKey: image.storageKey,
              fileName: image.fileName,
              mimeType: image.mimeType,
              size: image.size,
            });
          }

          importedItems += 1;
        }

        // Batch insert ItemMedia
        if (itemMediaToInsert.length > 0) {
          await tx.itemMedia.createMany({
            data: itemMediaToInsert,
          });
        }

        for (const row of payload.journalRows) {
          const defaultUom = await this.ensureUom(tx, 'CÁI', uomCache);
          const item = await this.ensureItem(tx, row.itemName, defaultUom.id, itemCache);
          let inventoryItem = inventoryCache.get(item.id);

          if (!inventoryItem) {
            inventoryItem = await tx.inventoryItem.create({
              data: {
                itemId: item.id,
                warehouseId: warehouse.id,
                openingQty: 0,
                totalInQty: 0,
                totalOutQty: 0,
                currentQty: 0,
                minQty: 5,
                status: InventoryStatus.OUT_OF_STOCK,
              },
            });
            inventoryCache.set(item.id, inventoryItem);
          }

          const project = row.projectName
            ? await this.ensureProject(
                tx,
                row.projectName,
                warehouse.unitId,
                projectCache,
              )
            : null;

          const transaction = await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: inventoryItem.id,
              itemId: item.id,
              warehouseId: warehouse.id,
              unitId: warehouse.unitId,
              projectId: project?.id,
              createdById: user.id,
              type: TransactionType.IN,
              quantity: 0,
              quantityBefore: inventoryItem.currentQty,
              quantityAfter: inventoryItem.currentQty,
              note: 'Import nhật ký legacy (chỉ tham chiếu)',
              metadata: {
                source: 'legacy_journal',
                referenceOnly: true,
                legacyDate: row.date,
                importedRow: row.rowNumber,
              } as never,
              legacyImported: true,
              createdAt: row.date ? new Date(row.date) : new Date(),
            },
          });

          for (const photo of row.photos) {
            await tx.transactionAttachment.create({
              data: {
                transactionId: transaction.id,
                kind: AttachmentKind.PHOTO,
                storageKey: photo.storageKey,
                fileName: photo.fileName,
                mimeType: photo.mimeType,
                size: photo.size,
              },
            });
          }

          for (const invoice of row.invoices) {
            await tx.transactionAttachment.create({
              data: {
                transactionId: transaction.id,
                kind: AttachmentKind.INVOICE,
                storageKey: invoice.storageKey,
                fileName: invoice.fileName,
                mimeType: invoice.mimeType,
                size: invoice.size,
              },
            });
          }

          importedJournalRows += 1;
        }

        await tx.importJob.update({
          where: { id: importJob.id },
          data: {
            status: ImportJobStatus.COMMITTED,
            committedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'IMPORT_COMMIT',
            entityType: 'import_jobs',
            entityId: importJob.id,
            metadata: {
              warehouseId: warehouse.id,
              importedItems,
              importedJournalRows,
            } as never,
          },
        });

        return {
          jobId: importJob.id,
          importedItems,
          importedJournalRows,
        };
      },
      {
        maxWait: 60000,
        timeout: 240000, // 4 minutes
      },
    );
  }

  async directImport(
    file: Express.Multer.File | undefined,
    dto: DirectImportDto,
    user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file Excel để import');
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException('Kho đích không tồn tại');
    }

    this.ensureUnitAccess(user, warehouse.unitId);

    const importJob = await this.prisma.importJob.create({
      data: {
        type: dto.type ?? ImportJobType.LEGACY_BOOTSTRAP,
        status: ImportJobStatus.PREVIEW, // initially set to preview, then committed
        fileName: file.originalname,
        createdById: user.id,
      },
    });

    const parsed = await parseLegacyWorkbook(file.buffer);
    const prefix = `imports/${importJob.id}`;

    const inventoryRows = await Promise.all(
      parsed.inventoryRows.map(async (row) => ({
        ...row,
        images: await Promise.all(
          row.images.map((image, index) =>
            this.mediaService.uploadBuffer(
              image.buffer,
              image.fileName || `inventory-${row.rowNumber}-${index + 1}.jpg`,
              `${prefix}/inventory`,
              image.mimeType,
            ),
          ),
        ),
      })),
    );

    const journalRows = await Promise.all(
      parsed.journalRows.map(async (row) => ({
        ...row,
        photos: await Promise.all(
          row.photos.map((image, index) =>
            this.mediaService.uploadBuffer(
              image.buffer,
              image.fileName || `photo-${row.rowNumber}-${index + 1}.jpg`,
              `${prefix}/journal-photos`,
              image.mimeType,
            ),
          ),
        ),
        invoices: await Promise.all(
          row.invoices.map((image, index) =>
            this.mediaService.uploadBuffer(
              image.buffer,
              image.fileName || `invoice-${row.rowNumber}-${index + 1}.jpg`,
              `${prefix}/journal-invoices`,
              image.mimeType,
            ),
          ),
        ),
      })),
    );

    const overwriteExisting = dto.overwriteExisting ?? true;

    const commitResult = await this.prisma.$transaction(
      async (tx) => {
        let importedItems = 0;
        let importedJournalRows = 0;

        const uomCache = new Map<string, any>();
        const itemCache = new Map<string, any>();
        const projectCache = new Map<string, any>();
        const inventoryCache = new Map<string, any>();

        const itemMediaToInsert: any[] = [];

        // 1. Pre-fetch UOMs
        const uomCodes = Array.from(
          new Set([
            ...inventoryRows.map((r) => r.uom.trim().toUpperCase()),
            'CÁI',
          ]),
        );
        const existingUoms = await tx.uom.findMany({
          where: { code: { in: uomCodes } },
        });
        for (const u of existingUoms) {
          uomCache.set(u.code, u);
        }

        // 2. Pre-fetch Items
        const itemNames = Array.from(
          new Set([
            ...inventoryRows.map((r) => r.itemName.trim()),
            ...journalRows.map((r) => r.itemName.trim()),
          ]),
        );
        const existingItems = await tx.item.findMany({
          where: { name: { in: itemNames } },
        });
        for (const item of existingItems) {
          const cacheKey = `${item.name.toLowerCase()}_${item.defaultUomId}`;
          itemCache.set(cacheKey, item);
        }

        // 3. Pre-fetch Projects
        const projectNames = Array.from(
          new Set(
            journalRows
              .map((r) => r.projectName)
              .filter(Boolean) as string[],
          ),
        );
        if (projectNames.length > 0) {
          const existingProjects = await tx.project.findMany({
            where: {
              OR: [
                { name: { in: projectNames } },
                {
                  code: {
                    in: projectNames.map((p) =>
                      this.slugify(p),
                    ),
                  },
                },
              ],
            },
          });
          for (const p of existingProjects) {
            projectCache.set(p.name.toLowerCase(), p);
            projectCache.set(p.code.toLowerCase(), p);
          }
        }

        // 4. Pre-fetch Inventory Items for this warehouse
        const existingInventoryList = await tx.inventoryItem.findMany({
          where: { warehouseId: warehouse.id },
        });
        for (const inv of existingInventoryList) {
          inventoryCache.set(inv.itemId, inv);
        }

        for (const row of inventoryRows) {
          const uom = await this.ensureUom(tx, row.uom, uomCache);
          const item = await this.ensureItem(tx, row.itemName, uom.id, itemCache);
          const existingInventory = inventoryCache.get(item.id);

          if (existingInventory && !overwriteExisting) {
            continue;
          }

          const minQty = existingInventory?.minQty ?? 5;
          const status = getInventoryStatus(row.currentQty, minQty);

          if (existingInventory) {
            await tx.inventoryItem.update({
              where: { id: existingInventory.id },
              data: {
                openingQty: row.openingQty,
                totalInQty: row.totalInQty,
                totalOutQty: row.totalOutQty,
                currentQty: row.currentQty,
                legacyStatus: row.legacyStatus,
                minQty,
                status,
                lastMovementAt: new Date(),
              },
            });
          } else {
            const newInv = await tx.inventoryItem.create({
              data: {
                itemId: item.id,
                warehouseId: warehouse.id,
                openingQty: row.openingQty,
                totalInQty: row.totalInQty,
                totalOutQty: row.totalOutQty,
                currentQty: row.currentQty,
                legacyStatus: row.legacyStatus,
                minQty,
                status,
                lastMovementAt: new Date(),
              },
            });
            inventoryCache.set(item.id, newInv);
          }

          for (const image of row.images) {
            itemMediaToInsert.push({
              itemId: item.id,
              uploadedById: user.id,
              storageKey: image.storageKey,
              fileName: image.fileName,
              mimeType: image.mimeType,
              size: image.size,
            });
          }

          importedItems += 1;
        }

        if (itemMediaToInsert.length > 0) {
          await tx.itemMedia.createMany({
            data: itemMediaToInsert,
          });
        }

        for (const row of journalRows) {
          const defaultUom = await this.ensureUom(tx, 'CÁI', uomCache);
          const item = await this.ensureItem(tx, row.itemName, defaultUom.id, itemCache);
          let inventoryItem = inventoryCache.get(item.id);

          if (!inventoryItem) {
            inventoryItem = await tx.inventoryItem.create({
              data: {
                itemId: item.id,
                warehouseId: warehouse.id,
                openingQty: 0,
                totalInQty: 0,
                totalOutQty: 0,
                currentQty: 0,
                minQty: 5,
                status: InventoryStatus.OUT_OF_STOCK,
              },
            });
            inventoryCache.set(item.id, inventoryItem);
          }

          const project = row.projectName
            ? await this.ensureProject(
                tx,
                row.projectName,
                warehouse.unitId,
                projectCache,
              )
            : null;

          const transaction = await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: inventoryItem.id,
              itemId: item.id,
              warehouseId: warehouse.id,
              unitId: warehouse.unitId,
              projectId: project?.id,
              createdById: user.id,
              type: TransactionType.IN,
              quantity: 0,
              quantityBefore: inventoryItem.currentQty,
              quantityAfter: inventoryItem.currentQty,
              note: 'Import nhật ký legacy (chỉ tham chiếu)',
              metadata: {
                source: 'legacy_journal',
                referenceOnly: true,
                legacyDate: row.date,
                importedRow: row.rowNumber,
              } as never,
              legacyImported: true,
              createdAt: row.date ? new Date(row.date) : new Date(),
            },
          });

          for (const photo of row.photos) {
            await tx.transactionAttachment.create({
              data: {
                transactionId: transaction.id,
                kind: AttachmentKind.PHOTO,
                storageKey: photo.storageKey,
                fileName: photo.fileName,
                mimeType: photo.mimeType,
                size: photo.size,
              },
            });
          }

          for (const invoice of row.invoices) {
            await tx.transactionAttachment.create({
              data: {
                transactionId: transaction.id,
                kind: AttachmentKind.INVOICE,
                storageKey: invoice.storageKey,
                fileName: invoice.fileName,
                mimeType: invoice.mimeType,
                size: invoice.size,
              },
            });
          }

          importedJournalRows += 1;
        }

        const previewSummary = {
          summary: {
            inventoryCount: inventoryRows.length,
            journalCount: journalRows.length,
            errorCount: parsed.errors.length,
            warningCount: parsed.warnings.length,
          },
          errors: parsed.errors,
          warnings: parsed.warnings,
        };

        await tx.importJob.update({
          where: { id: importJob.id },
          data: {
            status: ImportJobStatus.COMMITTED,
            committedAt: new Date(),
            previewSummary: previewSummary as any,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'IMPORT_DIRECT_COMMIT',
            entityType: 'import_jobs',
            entityId: importJob.id,
            metadata: {
              warehouseId: warehouse.id,
              importedItems,
              importedJournalRows,
            } as never,
          },
        });

        return {
          importedItems,
          importedJournalRows,
        };
      },
      {
        maxWait: 60000,
        timeout: 240000, // 4 minutes
      },
    );

    return {
      jobId: importJob.id,
      inventoryCount: inventoryRows.length,
      journalCount: journalRows.length,
      errorCount: parsed.errors.length,
      warningCount: parsed.warnings.length,
      errors: parsed.errors,
      warnings: parsed.warnings,
      ...commitResult,
    };
  }

  private async ensureUom(
    tx: Prisma.TransactionClient,
    rawCode: string,
    cache?: Map<string, any>,
  ) {
    const code = rawCode.trim().toUpperCase();
    if (cache?.has(code)) {
      return cache.get(code);
    }
    const existing = await tx.uom.findUnique({
      where: { code },
    });

    const result =
      existing ||
      (await tx.uom.create({
        data: {
          code,
          name: code,
        },
      }));

    cache?.set(code, result);
    return result;
  }

  private async ensureItem(
    tx: Prisma.TransactionClient,
    itemName: string,
    uomId: string,
    cache?: Map<string, any>,
  ) {
    const trimmed = itemName.trim();
    const cacheKey = `${trimmed.toLowerCase()}_${uomId}`;
    if (cache?.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const existing = await tx.item.findFirst({
      where: {
        name: trimmed,
        defaultUomId: uomId,
      },
    });

    const result =
      existing ||
      (await tx.item.create({
        data: {
          name: trimmed,
          sku: this.generateSku(itemName),
          defaultUomId: uomId,
        },
      }));

    cache?.set(cacheKey, result);
    return result;
  }

  private async ensureProject(
    tx: Prisma.TransactionClient,
    projectName: string,
    unitId: string,
    cache?: Map<string, any>,
  ) {
    const trimmed = projectName.trim();
    const cacheKey = trimmed.toLowerCase();
    if (cache?.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const normalizedCode = this.slugify(projectName);
    const existing = await tx.project.findFirst({
      where: {
        OR: [{ code: normalizedCode }, { name: trimmed }],
      },
    });

    const result =
      existing ||
      (await tx.project.create({
        data: {
          code: normalizedCode,
          name: trimmed,
          unitId,
        },
      }));

    cache?.set(cacheKey, result);
    return result;
  }

  private generateSku(itemName: string) {
    return `${this.slugify(itemName)}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toUpperCase()
      .slice(0, 24);

    return slug || 'GENERAL';
  }

  private ensureUnitAccess(user: AuthUser, unitId: string) {
    if (user.role !== RoleName.ADMIN && user.unitId && user.unitId !== unitId) {
      throw new ForbiddenException('Bạn không có quyền import vào kho này');
    }
  }
}
