import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsMongoId,
  IsString,
} from 'class-validator';
import { OrderType } from 'src/schemas/order.schema';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  clientId: string;

  @IsNotEmpty()
  service: string;

  @IsNotEmpty()
  typeService: string;

  @IsOptional()
  describe?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsNotEmpty()
  dateTimeOder: string;

  @IsNotEmpty()
  address: string;

  @IsNotEmpty()
  longitude: string;

  @IsNotEmpty()
  latitude: string;

  @IsOptional()
  @IsEnum(OrderType)
  typeOder?: OrderType;

  @IsOptional()
  rangePrice?: string;
}
