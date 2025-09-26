import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class AddApplicantDto {
  @IsNotEmpty()
  @IsMongoId()
  partnerId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  avatarUrl: string;

  @IsNotEmpty()
  offeredPrice: string;

  @IsNotEmpty()
  note: string;
}
