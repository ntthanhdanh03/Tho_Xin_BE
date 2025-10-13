import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PartnerKYCDocument = PartnerKYC & Document;

export enum KycApprovalStatus {
  PENDING = 'PENDING',
  WAITING = 'WAITING',
  APPROVED = 'APPROVED',
}

@Schema({ timestamps: true, strict: false })
export class PartnerKYC {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: false, default: '' })
  idCardNumber: string;

  @Prop({ required: false, default: '' })
  idCardFrontImageUrl: string;

  @Prop({ required: false, default: '' })
  idCardBackImageUrl: string;

  @Prop({ required: false, default: '' })
  criminalRecordImageUrl: string;

  @Prop({ required: false, default: '' })
  registeredSimImageUrl: string;

  @Prop({ required: false, default: '' })
  temporaryAddress: string;

  @Prop({ required: false, default: '' })
  permanentAddress: string;

  @Prop({ required: false, default: '' })
  idCardExpirationDate: Date;

  @Prop({
    type: String,
    enum: KycApprovalStatus,
    default: KycApprovalStatus.PENDING,
  })
  approved: KycApprovalStatus;
  @Prop({ type: [String], default: [] })
  choseField: string[];
}

export const PartnerKYCSchema = SchemaFactory.createForClass(PartnerKYC);
