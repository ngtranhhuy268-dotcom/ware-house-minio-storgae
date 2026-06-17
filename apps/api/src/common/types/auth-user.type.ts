import { RoleName } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
  unitId: string | null;
};
