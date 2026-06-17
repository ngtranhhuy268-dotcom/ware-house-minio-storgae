import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import type { AuthUser } from '../common/types/auth-user.type';
import { getInventoryStatusLabel } from '../common/utils/inventory-status.util';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { MediaService } from '../media/media.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async getInventory(dto: InventoryQueryDto, user: AuthUser) {
    const pagination = normalizePagination(dto.page, dto.pageSize);
    const where = this.buildWhere(dto, user);
    const orderBy = this.buildOrderBy(dto);

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        include: {
          item: {
            include: {
              defaultUom: true,
              media: {
                take: 1,
                orderBy: { createdAt: 'asc' },
              },
            },
          },
          warehouse: {
            include: { unit: true },
          },
          transactions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    const mapped = await Promise.all(
      items.map(async (inventoryItem) => ({
        id: inventoryItem.id,
        itemId: inventoryItem.itemId,
        sku: inventoryItem.item.sku,
        itemName: inventoryItem.item.name,
        description: inventoryItem.item.description,
        warehouseId: inventoryItem.warehouseId,
        warehouseName: inventoryItem.warehouse.name,
        unitId: inventoryItem.warehouse.unitId,
        unitName: inventoryItem.warehouse.unit.name,
        uomId: inventoryItem.item.defaultUomId,
        uomName: inventoryItem.item.defaultUom.name,
        currentQty: inventoryItem.currentQty,
        openingQty: inventoryItem.openingQty,
        totalInQty: inventoryItem.totalInQty,
        totalOutQty: inventoryItem.totalOutQty,
        minQty: inventoryItem.minQty,
        status: inventoryItem.status,
        statusLabel: getInventoryStatusLabel(inventoryItem.status),
        legacyStatus: inventoryItem.legacyStatus,
        lastMovementAt: inventoryItem.lastMovementAt,
        updatedAt: inventoryItem.updatedAt,
        latestNote: inventoryItem.transactions[0]?.note ?? null,
        imageUrl: inventoryItem.item.media[0]
          ? await this.mediaService.getSignedUrl(
              inventoryItem.item.media[0].storageKey,
            )
          : null,
      })),
    );

    return {
      items: mapped,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize) || 1,
      },
    };
  }

  async getOptions(user: AuthUser) {
    const unitFilter =
      user.role === RoleName.ADMIN || !user.unitId ? {} : { unitId: user.unitId };

    const [units, warehouses, projects, uoms] = await Promise.all([
      user.role === RoleName.ADMIN
        ? this.prisma.orgUnit.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
          })
        : this.prisma.orgUnit.findMany({
            where: { id: user.unitId ?? undefined },
          }),
      this.prisma.warehouse.findMany({
        where: {
          isActive: true,
          ...unitFilter,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.project.findMany({
        where: {
          isActive: true,
          ...unitFilter,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.uom.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      units,
      warehouses,
      projects,
      uoms,
      statuses: [
        { value: 'IN_STOCK', label: 'Còn hàng' },
        { value: 'LOW_STOCK', label: 'Sắp hết' },
        { value: 'OUT_OF_STOCK', label: 'Hết hàng' },
      ],
    };
  }

  async getInventoryById(id: string, user: AuthUser) {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        item: {
          include: {
            defaultUom: true,
            media: { orderBy: { createdAt: 'asc' } },
          },
        },
        warehouse: {
          include: { unit: true },
        },
        transactions: {
          take: 25,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: true,
            attachments: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Không tìm thấy vật tư trong kho');
    }

    this.ensureAccess(user, inventoryItem.warehouse.unitId);

    return {
      id: inventoryItem.id,
      itemId: inventoryItem.itemId,
      sku: inventoryItem.item.sku,
      itemName: inventoryItem.item.name,
      description: inventoryItem.item.description,
      warehouseId: inventoryItem.warehouseId,
      warehouseName: inventoryItem.warehouse.name,
      unitId: inventoryItem.warehouse.unitId,
      unitName: inventoryItem.warehouse.unit.name,
      uomId: inventoryItem.item.defaultUomId,
      uomName: inventoryItem.item.defaultUom.name,
      currentQty: inventoryItem.currentQty,
      openingQty: inventoryItem.openingQty,
      totalInQty: inventoryItem.totalInQty,
      totalOutQty: inventoryItem.totalOutQty,
      minQty: inventoryItem.minQty,
      status: inventoryItem.status,
      statusLabel: getInventoryStatusLabel(inventoryItem.status),
      legacyStatus: inventoryItem.legacyStatus,
      lastMovementAt: inventoryItem.lastMovementAt,
      images: await Promise.all(
        inventoryItem.item.media.map(async (media) => ({
          id: media.id,
          fileName: media.fileName,
          mimeType: media.mimeType,
          storageKey: media.storageKey,
          url: await this.mediaService.getSignedUrl(media.storageKey),
        })),
      ),
      transactions: await Promise.all(
        inventoryItem.transactions.map(async (transaction) => ({
          id: transaction.id,
          type: transaction.type,
          quantity: transaction.quantity,
          quantityBefore: transaction.quantityBefore,
          quantityAfter: transaction.quantityAfter,
          referenceCode: transaction.referenceCode,
          note: transaction.note,
          legacyImported: transaction.legacyImported,
          createdAt: transaction.createdAt,
          createdBy: transaction.createdBy.fullName,
          attachments: await Promise.all(
            transaction.attachments.map(async (attachment) => ({
              id: attachment.id,
              kind: attachment.kind,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              storageKey: attachment.storageKey,
              url: await this.mediaService.getSignedUrl(attachment.storageKey),
            })),
          ),
        })),
      ),
    };
  }

  private buildWhere(dto: InventoryQueryDto, user: AuthUser) {
    const clauses: Prisma.InventoryItemWhereInput[] = [];

    if (dto.warehouseId) {
      clauses.push({ warehouseId: dto.warehouseId });
    }

    const scopedUnitId =
      user.role === RoleName.ADMIN ? dto.unitId : user.unitId ?? dto.unitId;

    if (scopedUnitId) {
      clauses.push({ warehouse: { unitId: scopedUnitId } });
    }

    if (dto.status) {
      clauses.push({ status: dto.status });
    }

    if (dto.uomId) {
      clauses.push({ item: { defaultUomId: dto.uomId } });
    }

    if (dto.projectId) {
      clauses.push({ transactions: { some: { projectId: dto.projectId } } });
    }

    if (dto.hasAttachments === true) {
      clauses.push({
        OR: [
          { item: { media: { some: {} } } },
          { transactions: { some: { attachments: { some: {} } } } },
        ],
      });
    }

    if (dto.hasAttachments === false) {
      clauses.push({
        AND: [
          { item: { media: { none: {} } } },
          { transactions: { none: { attachments: { some: {} } } } },
        ],
      });
    }

    if (dto.updatedFrom || dto.updatedTo) {
      clauses.push({
        lastMovementAt: {
          gte: dto.updatedFrom ? new Date(dto.updatedFrom) : undefined,
          lte: dto.updatedTo ? new Date(dto.updatedTo) : undefined,
        },
      });
    }

    if (dto.search) {
      const search = dto.search.trim();
      clauses.push({
        OR: [
          { item: { name: { contains: search, mode: 'insensitive' } } },
          { item: { sku: { contains: search, mode: 'insensitive' } } },
          { warehouse: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    return clauses.length > 0 ? { AND: clauses } : {};
  }

  private buildOrderBy(dto: InventoryQueryDto): Prisma.InventoryItemOrderByWithRelationInput {
    const sortOrder = dto.sortOrder === 'asc' ? 'asc' : 'desc';

    switch (dto.sortBy) {
      case 'name':
        return { item: { name: sortOrder } };
      case 'qty':
        return { currentQty: sortOrder };
      case 'updatedAt':
      default:
        return { updatedAt: sortOrder };
    }
  }

  private ensureAccess(user: AuthUser, unitId: string) {
    if (user.role !== RoleName.ADMIN && user.unitId && user.unitId !== unitId) {
      throw new ForbiddenException('Bạn không có quyền xem kho thuộc đơn vị khác');
    }
  }
}
