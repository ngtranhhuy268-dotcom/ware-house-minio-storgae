import { InventoryStatus } from '@prisma/client';

export function getInventoryStatus(currentQty: number, minQty: number) {
  if (currentQty <= 0) {
    return InventoryStatus.OUT_OF_STOCK;
  }

  if (currentQty <= minQty) {
    return InventoryStatus.LOW_STOCK;
  }

  return InventoryStatus.IN_STOCK;
}

export function getInventoryStatusLabel(status: InventoryStatus) {
  switch (status) {
    case InventoryStatus.OUT_OF_STOCK:
      return 'Hết hàng';
    case InventoryStatus.LOW_STOCK:
      return 'Sắp hết';
    case InventoryStatus.IN_STOCK:
    default:
      return 'Còn hàng';
  }
}
