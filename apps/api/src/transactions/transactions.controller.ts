import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import {
  CreateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

const transactionFilesInterceptor = FileFieldsInterceptor([
  { name: 'itemImages', maxCount: 5 },
  { name: 'invoices', maxCount: 5 },
  { name: 'evidence', maxCount: 5 },
]);

@Controller('transactions')
@UseGuards(AuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  list(@Query() dto: TransactionQueryDto, @CurrentUser() user: AuthUser) {
    return this.transactionsService.list(dto, user);
  }

  @Post('in')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  @UseInterceptors(transactionFilesInterceptor)
  createIn(
    @Body() dto: CreateTransactionDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.createIn(dto, files, user);
  }

  @Post('out')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  @UseInterceptors(transactionFilesInterceptor)
  createOut(
    @Body() dto: CreateTransactionDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.createOut(dto, files, user);
  }

  @Post('adjust')
  @Roles(RoleName.ADMIN, RoleName.STAFF)
  @UseInterceptors(transactionFilesInterceptor)
  adjust(
    @Body() dto: CreateTransactionDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.adjust(dto, files, user);
  }
}
