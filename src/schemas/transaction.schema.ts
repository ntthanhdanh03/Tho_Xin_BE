import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionType = 'topUp' | 'withdraw' | 'appointment';
export type TransactionStatus = 'pending' | 'success' | 'failed';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['topUp', 'withdraw', 'appointment'] })
  type: TransactionType;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'pending', enum: ['pending', 'success', 'failed'] })
  status: TransactionStatus;

  @Prop()
  transactionId?: string;

  @Prop()
  balanceAfter?: number;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false })
  appointmentId?: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
