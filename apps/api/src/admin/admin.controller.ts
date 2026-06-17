import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { AdminService } from './admin.service';
import {
  CreateOrgUnitDto,
  CreateProjectDto,
  CreateUomDto,
  CreateUserDto,
  CreateWarehouseDto,
  UpdateOrgUnitDto,
  UpdateProjectDto,
  UpdateUomDto,
  UpdateUserDto,
  UpdateWarehouseDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.adminService.createUser(dto, user);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateUser(id, dto, user);
  }

  @Get('units')
  listUnits() {
    return this.adminService.listUnits();
  }

  @Post('units')
  createUnit(@Body() dto: CreateOrgUnitDto, @CurrentUser() user: AuthUser) {
    return this.adminService.createUnit(dto, user);
  }

  @Patch('units/:id')
  updateUnit(
    @Param('id') id: string,
    @Body() dto: UpdateOrgUnitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateUnit(id, dto, user);
  }

  @Get('warehouses')
  listWarehouses() {
    return this.adminService.listWarehouses();
  }

  @Post('warehouses')
  createWarehouse(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.createWarehouse(dto, user);
  }

  @Patch('warehouses/:id')
  updateWarehouse(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateWarehouse(id, dto, user);
  }

  @Get('projects')
  listProjects() {
    return this.adminService.listProjects();
  }

  @Post('projects')
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.adminService.createProject(dto, user);
  }

  @Patch('projects/:id')
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateProject(id, dto, user);
  }

  @Get('uoms')
  listUoms() {
    return this.adminService.listUoms();
  }

  @Post('uoms')
  createUom(@Body() dto: CreateUomDto, @CurrentUser() user: AuthUser) {
    return this.adminService.createUom(dto, user);
  }

  @Patch('uoms/:id')
  updateUom(
    @Param('id') id: string,
    @Body() dto: UpdateUomDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateUom(id, dto, user);
  }
}
