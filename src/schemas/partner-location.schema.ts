import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PartnerLocationDocument = PartnerLocation & Document;

@Schema({ timestamps: true })
export class PartnerLocation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  latitude: number;

  @Prop({ type: Number, required: true })
  longitude: number;
}

export const PartnerLocationSchema =
  SchemaFactory.createForClass(PartnerLocation);
