import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttachmentKind,
  InventoryStatus,
  Prisma,
  RoleName,
  TransactionType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import type { AuthUser } from '../common/types/auth-user.type';
import { getInventoryStatus } from '../common/utils/inventory-status.util';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { MediaService } from '../media/media.service';
import {
  CreateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

type UploadedFileMap = {
  itemImages?: Express.Multer.File[];
  invoices?: Express.Multer.File[];
  evidence?: Express.Multer.File[];
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async list(dto: TransactionQueryDto, user: AuthUser) {
    const pagination = normalizePagination(dto.page, dto.pageSize);
    const clauses: Prisma.InventoryTransactionWhereInput[] = [];

    if (user.role !== RoleName.ADMIN && user.unitId) {
      clauses.push({ warehouse: { unitId: user.unitId } });
    }

    if (dto.warehouseId) {
      clauses.push({ warehouseId: dto.warehouseId });
    }

    if (dto.projectId) {
      clauses.push({ projectId: dto.projectId });
    }

    if (dto.type) {
      clauses.push({ type: dto.type });
    }

    if (dto.search) {
      const search = dto.search.trim();
      clauses.push({
        OR: [
          { item: { name: { contains: search, mode: 'insensitive' } } },
          { note: { contains: search, mode: 'insensitive' } },
          { referenceCode: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where = clauses.length ? { AND: clauses } : {};

    const [items, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        include: {
          item: true,
          warehouse: true,
          createdBy: true,
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      items: await Promise.all(
        items.map(async (item) => ({
          id: item.id,
          type: item.type,
          itemName: item.item.name,
          warehouseName: item.warehouse.name,
          quantity: item.quantity,
          quantityBefore: item.quantityBefore,
          quantityAfter: item.quantityAfter,
          referenceCode: item.referenceCode,
          note: item.note,
          createdAt: item.createdAt,
          createdBy: item.createdBy.fullName,
          attachments: await Promise.all(
            item.attachments.map(async (attachment) => ({
              id: attachment.id,
              kind: attachment.kind,
              fileName: attachment.fileName,
              url: await this.mediaService.getSignedUrl(attachment.storageKey),
            })),
          ),
        })),
      ),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize) || 1,
      },
    };
  }

  createIn(dto: CreateTransactionDto, files: UploadedFileMap, user: AuthUser) {
    return this.applyTransaction(TransactionType.IN, dto, files, user);
  }

  createOut(dto: CreateTransactionDto, files: UploadedFileMap, user: AuthUser) {
    return this.applyTransaction(TransactionType.OUT, dto, files, user);
  }

  adjust(dto: CreateTransactionDto, files: UploadedFileMap, user: AuthUser) {
    return this.applyTransaction(TransactionType.ADJUSTMENT, dto, files, user);
  }

  private async applyTransaction(
    type: TransactionType,
    dto: CreateTransactionDto,
    files: UploadedFileMap,
    user: AuthUser,
  ) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException('Kho không tồn tại');
    }

    this.ensureUnitAccess(user, warehouse.unitId);

    const uploaded = await this.uploadFiles(files);

    return this.prisma.$transaction(async (tx) => {
      const { item, inventoryItem } = await this.resolveItemAndInventory(
        tx,
        dto,
        type,
        warehouse.id,
      );

      const currentInventoryItem =
        inventoryItem ??
        (await tx.inventoryItem.create({
          data: {
            itemId: item.id,
            warehouseId: warehouse.id,
            openingQty: 0,
            totalInQty: 0,
            totalOutQty: 0,
            currentQty: 0,
            minQty: dto.minQty ?? 5,
            status: InventoryStatus.IN_STOCK,
          },
        }));

      const quantityBefore = currentInventoryItem.currentQty;
      const minQty = dto.minQty ?? currentInventoryItem.minQty;
      let quantity = dto.quantity ?? 0;
      let quantityAfter = quantityBefore;
      let totalInQty = currentInventoryItem.totalInQty;
      let totalOutQty = currentInventoryItem.totalOutQty;

      if (type === TransactionType.IN) {
        if (!dto.quantity) {
          throw new BadRequestException('Số lượng nhập phải lớn hơn 0');
        }

        quantityAfter = quantityBefore + dto.quantity;
        totalInQty += dto.quantity;
      }

      if (type === TransactionType.OUT) {
        if (!dto.quantity) {
          throw new BadRequestException('Số lượng xuất phải lớn hơn 0');
        }

        if (!dto.note?.trim()) {
          throw new BadRequestException('Vui lòng nhập lý do xuất kho');
        }

        if (quantityBefore < dto.quantity) {
          throw new BadRequestException('Không thể xuất âm tồn kho');
        }

        quantityAfter = quantityBefore - dto.quantity;
        totalOutQty += dto.quantity;
      }

      if (type === TransactionType.ADJUSTMENT) {
        if (dto.targetQuantity === undefined) {
          throw new BadRequestException('Thiếu số lượng đích để chỉnh kho');
        }

        quantityAfter = dto.targetQuantity;
        quantity = Math.abs(dto.targetQuantity - quantityBefore);

        if (dto.targetQuantity > quantityBefore) {
          totalInQty += dto.targetQuantity - quantityBefore;
        } else {
          totalOutQty += quantityBefore - dto.targetQuantity;
        }
      }

      const updatedInventory = await tx.inventoryItem.update({
        where: { id: currentInventoryItem.id },
        data: {
          currentQty: quantityAfter,
          totalInQty,
          totalOutQty,
          minQty,
          status: getInventoryStatus(quantityAfter, minQty),
          lastMovementAt: new Date(),
        },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: updatedInventory.id,
          itemId: item.id,
          warehouseId: warehouse.id,
          unitId: warehouse.unitId,
          projectId: dto.projectId,
          createdById: user.id,
          type,
          quantity,
          quantityBefore,
          quantityAfter,
          referenceCode: dto.referenceCode,
          note: dto.note,
        },
      });

      for (const file of uploaded.itemImages) {
        await tx.itemMedia.create({
          data: {
            itemId: item.id,
            uploadedById: user.id,
            storageKey: file.storageKey,
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
          },
        });

        await tx.transactionAttachment.create({
          data: {
            transactionId: transaction.id,
            kind: AttachmentKind.PHOTO,
            storageKey: file.storageKey,
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
          },
        });
      }

      for (const file of uploaded.invoices) {
        await tx.transactionAttachment.create({
          data: {
            transactionId: transaction.id,
            kind: AttachmentKind.INVOICE,
            storageKey: file.storageKey,
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
          },
        });
      }

      for (const file of uploaded.evidence) {
        await tx.transactionAttachment.create({
          data: {
            transactionId: transaction.id,
            kind: AttachmentKind.EVIDENCE,
            storageKey: file.storageKey,
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: `TRANSACTION_${type}`,
          entityType: 'inventory_transactions',
          entityId: transaction.id,
          metadata: {
            itemId: item.id,
            warehouseId: warehouse.id,
            quantity,
            quantityBefore,
            quantityAfter,
          } as never,
        },
      });

      return {
        id: transaction.id,
        type: transaction.type,
        quantity: transaction.quantity,
        quantityBefore: transaction.quantityBefore,
        quantityAfter: transaction.quantityAfter,
        inventoryItemId: updatedInventory.id,
      };
    });
  }

  private async resolveItemAndInventory(
    tx: Prisma.TransactionClient,
    dto: CreateTransactionDto,
    type: TransactionType,
    warehouseId: string,
  ) {
    let item = dto.itemId
      ? await tx.item.findUnique({
          where: { id: dto.itemId },
        })
      : null;

    if (!item && dto.itemName && dto.uomId) {
      item = await tx.item.findFirst({
        where: {
          name: dto.itemName.trim(),
          defaultUomId: dto.uomId,
        },
      });

      if (!item && type === TransactionType.IN) {
        item = await tx.item.create({
          data: {
            name: dto.itemName.trim(),
            sku: this.generateSku(dto.itemName),
            defaultUomId: dto.uomId,
          },
        });
      }
    }

    if (!item) {
      throw new NotFoundException('Không tìm thấy vật tư');
    }

    let inventoryItem = await tx.inventoryItem.findUnique({
      where: {
        itemId_warehouseId: {
          itemId: item.id,
          warehouseId,
        },
      },
    });

    if (!inventoryItem && type === TransactionType.OUT) {
      throw new BadRequestException('Vật tư chưa tồn tại trong kho để xuất');
    }

    if (!inventoryItem && type === TransactionType.ADJUSTMENT) {
      inventoryItem = await tx.inventoryItem.create({
        data: {
          itemId: item.id,
          warehouseId,
          openingQty: 0,
          totalInQty: 0,
          totalOutQty: 0,
          currentQty: 0,
          minQty: dto.minQty ?? 5,
          status: InventoryStatus.IN_STOCK,
        },
      });
    }

    return { item, inventoryItem };
  }

  private generateSku(itemName: string) {
    const normalized = itemName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .toUpperCase()
      .slice(0, 24);

    return `${normalized || 'ITEM'}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }

  private ensureUnitAccess(user: AuthUser, unitId: string) {
    if (user.role !== RoleName.ADMIN && user.unitId && user.unitId !== unitId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên kho này');
    }
  }

  private async uploadFiles(files: UploadedFileMap) {
    const uploadGroup = async (
      fileGroup: Express.Multer.File[] | undefined,
      prefix: string,
    ) =>
      Promise.all(
        (fileGroup ?? []).map((file) =>
          this.mediaService.uploadBuffer(
            file.buffer,
            Buffer.from(file.originalname, 'latin1').toString('utf8'),
            prefix,
            file.mimetype,
          ),
        ),
      );

    const [itemImages, invoices, evidence] = await Promise.all([
      uploadGroup(files.itemImages, 'transactions/item-images'),
      uploadGroup(files.invoices, 'transactions/invoices'),
      uploadGroup(files.evidence, 'transactions/evidence'),
    ]);

    return {
      itemImages,
      invoices,
      evidence,
    };
  }
}
