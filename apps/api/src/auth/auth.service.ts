import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { getAppConfig } from '../config/app.config';
import { LoginDto } from './dto/login.dto';

type TokenPayload = {
  sub: string;
  email: string;
  fullName: string;
  role: RoleName;
  unitId: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { role: true, unit: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      unitId: user.unitId,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        roleLabel: user.role.label,
        unitId: user.unitId,
        unitName: user.unit?.name ?? null,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: getAppConfig().refreshTokenSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, unit: true },
      });

      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Refresh token không còn hiệu lực');
      }

      const matched = await bcrypt.compare(refreshToken, user.refreshTokenHash);

      if (!matched) {
        throw new UnauthorizedException('Refresh token không còn hiệu lực');
      }

      const tokens = await this.issueTokens({
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        unitId: user.unitId,
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role.name,
          roleLabel: user.role.label,
          unitId: user.unitId,
          unitName: user.unit?.name ?? null,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { success: true };
  }

  private async issueTokens(payload: TokenPayload) {
    const config = getAppConfig();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: config.accessTokenSecret,
        expiresIn: config.accessTokenExpiresIn as never,
      }),
      this.jwtService.signAsync(payload, {
        secret: config.refreshTokenSecret,
        expiresIn: config.refreshTokenExpiresIn as never,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.accessTokenExpiresIn,
    };
  }
}
