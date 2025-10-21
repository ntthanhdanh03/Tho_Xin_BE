import { IsString } from 'class-validator';

export class ApplyPromotionDto {
  @IsString()
  appointmentId: string;

  @IsString()
  promoCode: string;

  @IsString()
  userId: string;
}
