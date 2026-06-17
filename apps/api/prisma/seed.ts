import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: RoleName.ADMIN, label: 'Admin' },
    { name: RoleName.STAFF, label: 'Nhân viên kho' },
    { name: RoleName.TECHNICIAN, label: 'Thợ' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label },
      create: role,
    });
  }

  const unit = await prisma.orgUnit.upsert({
    where: { code: 'MAIN' },
    update: {
      name: 'Kho Trung Tâm',
      description: 'Đơn vị mặc định cho hệ thống nội bộ',
    },
    create: {
      code: 'MAIN',
      name: 'Kho Trung Tâm',
      description: 'Đơn vị mặc định cho hệ thống nội bộ',
    },
  });

  await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {
      unitId: unit.id,
      name: 'Kho Chính',
      description: 'Kho mặc định cho dữ liệu import ban đầu',
    },
    create: {
      code: 'WH-MAIN',
      name: 'Kho Chính',
      unitId: unit.id,
      description: 'Kho mặc định cho dữ liệu import ban đầu',
    },
  });

  await prisma.project.upsert({
    where: { code: 'GENERAL' },
    update: {
      unitId: unit.id,
      name: 'Công trình chung',
      description: 'Project mặc định để gắn dữ liệu chưa phân loại',
    },
    create: {
      code: 'GENERAL',
      name: 'Công trình chung',
      unitId: unit.id,
      description: 'Project mặc định để gắn dữ liệu chưa phân loại',
    },
  });

  await prisma.uom.upsert({
    where: { code: 'CAI' },
    update: {
      name: 'Cái',
      description: 'Đơn vị tính mặc định',
    },
    create: {
      code: 'CAI',
      name: 'Cái',
      description: 'Đơn vị tính mặc định',
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.ADMIN },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@warehouse.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
  const adminName = process.env.ADMIN_NAME ?? 'Warehouse Admin';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminName,
      passwordHash,
      roleId: adminRole.id,
      unitId: unit.id,
      isActive: true,
    },
    create: {
      email: adminEmail,
      fullName: adminName,
      passwordHash,
      roleId: adminRole.id,
      unitId: unit.id,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
