import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaidTransactionDocument = PaidTransaction & Document;

@Schema({ timestamps: true })
export class PaidTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  partnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, default: '' })
  transactionCode: string;

  @Prop({
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'success' | 'failed';
}

export const PaidTransactionSchema =
  SchemaFactory.createForClass(PaidTransaction);
