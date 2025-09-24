import { IsNotEmpty, IsMongoId } from 'class-validator';

export class SelectApplicantDto {
  @IsNotEmpty()
  @IsMongoId()
  partnerId: string;
}
