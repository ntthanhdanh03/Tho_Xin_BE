import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { PromotionType } from 'src/schemas/promotion.schema';

export class CreatePromotionDto {
  @IsString()
  code: string;

  @IsEnum(PromotionType)
  type: PromotionType;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsArray()
  allowedUsers?: string[];

  @IsOptional()
  @IsNumber()
  usagePerUser?: number;
}
