import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { InventoryQueryDto } from '../inventory/dto/inventory-query.dto';
import { ExportsService } from './exports.service';

@Controller('exports')
@UseGuards(AuthGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('excel')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  async exportExcel(
    @Query() dto: InventoryQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const buffer = await this.exportsService.buildWorkbook(dto, user);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="warehouse-export-${Date.now()}.xlsx"`,
    );
    res.send(Buffer.from(buffer));
  }
}
