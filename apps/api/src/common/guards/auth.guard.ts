import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getAppConfig } from '../../config/app.config';
import type { AuthUser } from '../types/auth-user.type';
import { RoleName } from '@prisma/client';

type AccessTokenPayload = {
  sub: string;
  email: string;
  fullName: string;
  role: RoleName;
  unitId: string | null;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu access token');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: getAppConfig().accessTokenSecret,
        },
      );

      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
        unitId: payload.unitId,
      };

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ');
    }
  }
}
