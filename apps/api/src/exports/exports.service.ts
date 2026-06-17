import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { AuthUser } from '../common/types/auth-user.type';
import { InventoryQueryDto } from '../inventory/dto/inventory-query.dto';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../database/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async buildWorkbook(dto: InventoryQueryDto, user: AuthUser) {
    const inventory = await this.inventoryService.getInventory(
      {
        ...dto,
        page: 1,
        pageSize: 100,
      },
      user,
    );

    const workbook = new ExcelJS.Workbook();
    const inventorySheet = workbook.addWorksheet('SL TỒN KHO');
    const journalSheet = workbook.addWorksheet('Trang tính1');

    inventorySheet.columns = [
      { key: 'stt', width: 8 },
      { key: 'name', width: 36 },
      { key: 'image', width: 18 },
      { key: 'uom', width: 12 },
      { key: 'opening', width: 12 },
      { key: 'inQty', width: 12 },
      { key: 'outQty', width: 12 },
      { key: 'current', width: 12 },
      { key: 'status', width: 16 },
    ];

    inventorySheet.getRow(4).values = [
      'STT',
      'TÊN VẬT TƯ',
      'HÌNH ẢNH',
      'ĐVT',
      'TỒN ĐẦU',
      'NHẬP',
      'XUẤT',
      'TỒN CUỐI',
      'TRẠNG THÁI',
    ];
    inventorySheet.getRow(4).font = { bold: true };
    inventorySheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' },
    };

    for (const [index, item] of inventory.items.entries()) {
      const rowNumber = index + 5;
      inventorySheet.getRow(rowNumber).height = 58;
      inventorySheet.getRow(rowNumber).values = [
        index + 1,
        item.itemName,
        '',
        item.uomName,
        item.openingQty,
        item.totalInQty,
        item.totalOutQty,
        item.currentQty,
        item.statusLabel,
      ];

      const detail = await this.inventoryService.getInventoryById(item.id, user);
      const firstImage = detail.images[0];

      if (firstImage) {
        const imageId = workbook.addImage({
          base64: this.toBase64Image(
            await this.mediaService.getBuffer(firstImage.storageKey),
            firstImage.mimeType,
          ),
          extension: this.getExcelImageExtension(firstImage.mimeType),
        });
        inventorySheet.addImage(imageId, {
          tl: { col: 2, row: rowNumber - 1 + 0.1 },
          ext: { width: 72, height: 52 },
        });
      }
    }

    journalSheet.columns = [
      { key: 'date', width: 16 },
      { key: 'name', width: 36 },
      { key: 'photo', width: 18 },
      { key: 'blank1', width: 8 },
      { key: 'blank2', width: 8 },
      { key: 'project', width: 24 },
      { key: 'invoice', width: 18 },
    ];

    journalSheet.getRow(1).values = [
      'NGÀY',
      'TÊN VẬT TƯ',
      'HÌNH ẢNH',
      '',
      '',
      'CÔNG TRINH',
      'HÓA ĐƠN',
    ];
    journalSheet.getRow(1).font = { bold: true };
    journalSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' },
    };

    const transactions = await this.prisma.inventoryTransaction.findMany({
      include: {
        item: true,
        project: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    for (const [index, transaction] of transactions.entries()) {
      const rowNumber = index + 2;
      journalSheet.getRow(rowNumber).height = 58;
      journalSheet.getRow(rowNumber).values = [
        transaction.createdAt,
        `${
          transaction.type === 'IN'
            ? ''
            : transaction.type === 'OUT'
              ? '[XUẤT] '
              : '[CHỈNH] '
        }${transaction.item.name}`,
        '',
        '',
        '',
        transaction.project?.name ?? '',
        '',
      ];

      const photo = transaction.attachments.find((item) => item.kind === 'PHOTO');
      const invoice = transaction.attachments.find((item) => item.kind === 'INVOICE');

      if (photo) {
        const imageId = workbook.addImage({
          base64: this.toBase64Image(
            await this.mediaService.getBuffer(photo.storageKey),
            photo.mimeType,
          ),
          extension: this.getExcelImageExtension(photo.mimeType),
        });
        journalSheet.addImage(imageId, {
          tl: { col: 2, row: rowNumber - 1 + 0.1 },
          ext: { width: 72, height: 52 },
        });
      }

      if (invoice) {
        const imageId = workbook.addImage({
          base64: this.toBase64Image(
            await this.mediaService.getBuffer(invoice.storageKey),
            invoice.mimeType,
          ),
          extension: this.getExcelImageExtension(invoice.mimeType),
        });
        journalSheet.addImage(imageId, {
          tl: { col: 6, row: rowNumber - 1 + 0.1 },
          ext: { width: 72, height: 52 },
        });
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  private getExcelImageExtension(mimeType: string) {
    if (mimeType.includes('png')) {
      return 'png';
    }

    return 'jpeg';
  }

  private toBase64Image(buffer: Buffer, mimeType: string) {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}
