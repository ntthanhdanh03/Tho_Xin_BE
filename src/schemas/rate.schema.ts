import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RateDocument = Rate & Document;

@Schema({ timestamps: true })
export class Rate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  partnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating: number;

  @Prop({ type: String, default: '' })
  comment: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const RateSchema = SchemaFactory.createForClass(Rate);
