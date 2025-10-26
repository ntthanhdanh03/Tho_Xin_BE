import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  NAVIGATION = 1, // Xem bản đồ, theo dõi đường đi
  INSPECTION = 2, // Kiểm tra lần cuối
  WORKING = 3, // Đang sửa chữa
  HANDOVER = 4, // Bàn giao cho khách kiểm tra
  PAYMENT = 5, // Chờ thanh toán
  COMPLETED = 6, // Thanh toán xong, hoàn tất
  CANCELLED = 7, // Hủy
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChatRoom', required: true })
  roomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  partnerId: Types.ObjectId;

  @Prop({ enum: AppointmentStatus, default: AppointmentStatus.NAVIGATION })
  status: AppointmentStatus;

  @Prop({ type: Number, default: 0 })
  agreedPrice: number;

  @Prop({ type: Number, default: 0 })
  laborCost: number;

  @Prop({ type: String, default: null })
  promotionCode?: string;

  @Prop({ type: Number, default: 0 })
  promotionDiscount: number;

  @Prop({ type: Number, default: 0 })
  finalAmount: number;

  @Prop({ type: String, default: '' })
  cancelReason?: string;

  @Prop({
    type: {
      note: { type: String, default: '' },
      images: { type: [String], default: [] },
      approve: { type: Boolean, default: false },
    },
    default: {
      note: '',
      images: [],
      approve: false,
    },
  })
  beforeImages: {
    note: string;
    images: string[];
    approve: boolean;
  };

  @Prop({
    type: {
      note: { type: String, default: '' },
      images: { type: [String], default: [] },
      approve: { type: Boolean, default: false },
    },
    default: {
      note: '',
      images: [],
      approve: false,
    },
  })
  afterImages: {
    note: string;
    images: string[];
    approve: boolean;
  };

  @Prop({
    type: [
      {
        note: { type: String, default: '' },
        images: { type: [String], default: [] },
        cost: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  additionalIssues: {
    note: string;
    images: string[];
    cost?: number;
  }[];

  @Prop({ type: Boolean, default: false })
  additionalIssuesApproved: boolean;

  @Prop({ default: '' })
  paymentMethod: string;

  @Prop({ type: Types.ObjectId, ref: 'PaidTransaction', default: null })
  transactionId?: Types.ObjectId;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
