import { ImportJobType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class PreviewImportDto {
  @IsOptional()
  @IsEnum(ImportJobType)
  type?: ImportJobType;
}

export class CommitImportDto {
  @IsString()
  jobId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overwriteExisting?: boolean;
}

export class DirectImportDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overwriteExisting?: boolean;

  @IsOptional()
  @IsEnum(ImportJobType)
  type?: ImportJobType;
}

