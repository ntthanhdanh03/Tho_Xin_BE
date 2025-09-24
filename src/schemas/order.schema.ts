import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderType {
  SELECT = 'select',
  ASSIGN = 'assign',
}

export enum OrderStatus {
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  service: string;

  @Prop({ required: true })
  typeService: string;

  @Prop()
  describe: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ required: true })
  dateTimeOder: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  longitude: string;

  @Prop({ required: true })
  latitude: string;

  @Prop({ enum: OrderType, default: OrderType.SELECT })
  typeOder: OrderType;

  @Prop()
  rangePrice: string;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({
    type: [
      {
        partnerId: { type: Types.ObjectId, ref: 'User' },
        name: String,
        avatarUrl: String,
        offeredPrice: String,
      },
    ],
    default: [],
  })
  applicants: {
    partnerId: Types.ObjectId;
    name: string;
    avatarUrl: string;
    offeredPrice: string;
  }[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);
