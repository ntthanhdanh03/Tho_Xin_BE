import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type PartnerProfileDocument = PartnerProfile & Document;

@Schema({ timestamps: true, strict: false })
export class PartnerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: false })
  isLock: boolean;

  @Prop({ type: Date, default: null })
  lastOnlineAt: Date;
}

export const PartnerProfileSchema =
  SchemaFactory.createForClass(PartnerProfile);
