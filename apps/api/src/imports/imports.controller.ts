import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { CommitImportDto, PreviewImportDto } from './dto/import.dto';
import { ImportsService } from './imports.service';

@Controller('imports/excel')
@UseGuards(AuthGuard, RolesGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('preview')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  @UseInterceptors(FileInterceptor('file'))
  preview(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: PreviewImportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importsService.preview(file, dto, user);
  }

  @Post('commit')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  commit(@Body() dto: CommitImportDto, @CurrentUser() user: AuthUser) {
    return this.importsService.commit(dto, user);
  }
}
