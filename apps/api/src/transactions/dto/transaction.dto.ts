import { TransactionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

export class CreateTransactionDto {
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  itemId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  itemName?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  uomId?: string;

  @ValidateIf((object) => object.targetQuantity === undefined)
  @Type(() => Number)
  @Transform(({ value }) => toNumber(value))
  @Min(0.0001)
  quantity?: number;

  @ValidateIf((object) => object.quantity === undefined)
  @Type(() => Number)
  @Transform(({ value }) => toNumber(value))
  @Min(0)
  targetQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => toNumber(value))
  @Min(0)
  minQty?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  projectId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  note?: string;
}

export class TransactionQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
