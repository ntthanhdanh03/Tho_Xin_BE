import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePartnerOnlineDto {
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}
