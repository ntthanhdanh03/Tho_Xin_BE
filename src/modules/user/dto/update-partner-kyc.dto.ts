export class UpdatePartnerKycDto {
  idCardNumber?: string;
  idCardFrontImageUrl?: string;
  idCardBackImageUrl?: string;
  criminalRecordImageUrl?: string;
  registeredSimImageUrl?: string;
  temporaryAddress?: string;
  permanentAddress?: string;
  idCardExpirationDate?: Date;
  approved?: 'PENDING' | 'WAITING' | 'APPROVED';
  choseField?: string[];
}
