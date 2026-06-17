import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventory(@Query() dto: InventoryQueryDto, @CurrentUser() user: AuthUser) {
    return this.inventoryService.getInventory(dto, user);
  }

  @Get('options')
  getOptions(@CurrentUser() user: AuthUser) {
    return this.inventoryService.getOptions(user);
  }

  @Get(':id')
  getInventoryById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.inventoryService.getInventoryById(id, user);
  }
}
