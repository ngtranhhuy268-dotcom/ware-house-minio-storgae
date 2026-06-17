import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user.type';
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

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [roles, users, units, warehouses, projects, uoms, importJobs] =
      await Promise.all([
        this.prisma.role.findMany({ orderBy: { label: 'asc' } }),
        this.prisma.user.findMany({
          include: { role: true, unit: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.orgUnit.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.warehouse.findMany({
          include: { unit: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.project.findMany({
          include: { unit: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.uom.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.importJob.findMany({
          include: { createdBy: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    return {
      roles,
      users,
      units,
      warehouses,
      projects,
      uoms,
      importJobs,
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      include: { role: true, unit: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: CreateUserDto, actor: AuthUser) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
    });

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: role.id,
        unitId: dto.unitId ?? null,
        isActive: dto.isActive ?? true,
      },
      include: { role: true, unit: true },
    });

    await this.writeAuditLog(actor.id, 'CREATE_USER', 'users', user.id, dto);
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actor: AuthUser) {
    let roleId: string | undefined;

    if (dto.role) {
      const role = await this.prisma.role.findUniqueOrThrow({
        where: { name: dto.role },
      });
      roleId = role.id;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        email: dto.email?.toLowerCase().trim(),
        passwordHash: dto.password
          ? await bcrypt.hash(dto.password, 10)
          : undefined,
        roleId,
        unitId: dto.unitId === undefined ? undefined : dto.unitId,
        isActive: dto.isActive,
      },
      include: { role: true, unit: true },
    });

    await this.writeAuditLog(actor.id, 'UPDATE_USER', 'users', user.id, dto);
    return user;
  }

  listUnits() {
    return this.prisma.orgUnit.findMany({ orderBy: { name: 'asc' } });
  }

  async createUnit(dto: CreateOrgUnitDto, actor: AuthUser) {
    const unit = await this.prisma.orgUnit.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });

    await this.writeAuditLog(actor.id, 'CREATE_UNIT', 'org_units', unit.id, dto);
    return unit;
  }

  async updateUnit(id: string, dto: UpdateOrgUnitDto, actor: AuthUser) {
    const unit = await this.prisma.orgUnit.update({
      where: { id },
      data: {
        code: dto.code?.trim().toUpperCase(),
        name: dto.name?.trim(),
        description: dto.description,
        isActive: dto.isActive,
      },
    });

    await this.writeAuditLog(actor.id, 'UPDATE_UNIT', 'org_units', unit.id, dto);
    return unit;
  }

  listWarehouses() {
    return this.prisma.warehouse.findMany({
      include: { unit: true },
      orderBy: { name: 'asc' },
    });
  }

  async createWarehouse(dto: CreateWarehouseDto, actor: AuthUser) {
    const warehouse = await this.prisma.warehouse.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        unitId: dto.unitId,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { unit: true },
    });

    await this.writeAuditLog(
      actor.id,
      'CREATE_WAREHOUSE',
      'warehouses',
      warehouse.id,
      dto,
    );
    return warehouse;
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto, actor: AuthUser) {
    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: {
        code: dto.code?.trim().toUpperCase(),
        name: dto.name?.trim(),
        unitId: dto.unitId,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: { unit: true },
    });

    await this.writeAuditLog(
      actor.id,
      'UPDATE_WAREHOUSE',
      'warehouses',
      warehouse.id,
      dto,
    );
    return warehouse;
  }

  listProjects() {
    return this.prisma.project.findMany({
      include: { unit: true },
      orderBy: { name: 'asc' },
    });
  }

  async createProject(dto: CreateProjectDto, actor: AuthUser) {
    const project = await this.prisma.project.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        unitId: dto.unitId,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { unit: true },
    });

    await this.writeAuditLog(
      actor.id,
      'CREATE_PROJECT',
      'projects',
      project.id,
      dto,
    );
    return project;
  }

  async updateProject(id: string, dto: UpdateProjectDto, actor: AuthUser) {
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        code: dto.code?.trim().toUpperCase(),
        name: dto.name?.trim(),
        unitId: dto.unitId,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: { unit: true },
    });

    await this.writeAuditLog(
      actor.id,
      'UPDATE_PROJECT',
      'projects',
      project.id,
      dto,
    );
    return project;
  }

  listUoms() {
    return this.prisma.uom.findMany({ orderBy: { name: 'asc' } });
  }

  async createUom(dto: CreateUomDto, actor: AuthUser) {
    const uom = await this.prisma.uom.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description,
      },
    });

    await this.writeAuditLog(actor.id, 'CREATE_UOM', 'uoms', uom.id, dto);
    return uom;
  }

  async updateUom(id: string, dto: UpdateUomDto, actor: AuthUser) {
    const uom = await this.prisma.uom.update({
      where: { id },
      data: {
        code: dto.code?.trim().toUpperCase(),
        name: dto.name?.trim(),
        description: dto.description,
      },
    });

    await this.writeAuditLog(actor.id, 'UPDATE_UOM', 'uoms', uom.id, dto);
    return uom;
  }

  private async writeAuditLog(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata as never,
      },
    });
  }
}
