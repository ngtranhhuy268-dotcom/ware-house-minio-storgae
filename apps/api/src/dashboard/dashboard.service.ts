import { Injectable } from '@nestjs/common';
import { InventoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user.type';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getIndicators(user: AuthUser) {
    const inventoryWhere: Prisma.InventoryItemWhereInput =
      user.role === 'ADMIN' || !user.unitId
        ? {}
        : { warehouse: { unitId: user.unitId } };

    const transactionWhere: Prisma.InventoryTransactionWhereInput =
      user.role === 'ADMIN' || !user.unitId
        ? {}
        : { warehouse: { unitId: user.unitId } };

    const [
      totalSku,
      inStock,
      lowStock,
      outOfStock,
      recentTransactions,
      unitCount,
      warehouseCount,
    ] = await Promise.all([
      this.prisma.inventoryItem.count({ where: inventoryWhere }),
      this.prisma.inventoryItem.count({
        where: { ...inventoryWhere, status: InventoryStatus.IN_STOCK },
      }),
      this.prisma.inventoryItem.count({
        where: { ...inventoryWhere, status: InventoryStatus.LOW_STOCK },
      }),
      this.prisma.inventoryItem.count({
        where: { ...inventoryWhere, status: InventoryStatus.OUT_OF_STOCK },
      }),
      this.prisma.inventoryTransaction.count({
        where: {
          ...transactionWhere,
          createdAt: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
          },
        },
      }),
      this.prisma.orgUnit.count(),
      this.prisma.warehouse.count(),
    ]);

    return {
      totalSku,
      inStock,
      lowStock,
      outOfStock,
      recentTransactions,
      unitCount,
      warehouseCount,
    };
  }
}
