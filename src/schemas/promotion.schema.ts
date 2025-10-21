import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromotionDocument = Promotion & Document;

export enum PromotionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum PromotionCategory {
  GLOBAL = 'global', // ai cũng dùng được
  PERSONAL = 'personal', // chỉ định user cụ thể
  WELCOME = 'welcome', // tự động tặng khi đăng ký
  EVENT = 'event', // theo sự kiện / chiến dịch
}

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ enum: PromotionType, required: true })
  type: PromotionType;

  @Prop({ required: true })
  value: number;

  @Prop({ default: null })
  minOrderValue?: number;

  @Prop({ default: null })
  maxDiscount?: number;

  @Prop({ default: Date.now })
  startDate: Date;

  @Prop({ default: null })
  endDate?: Date;

  @Prop({ enum: PromotionCategory, default: PromotionCategory.GLOBAL })
  category: PromotionCategory;

  @Prop({ type: [Types.ObjectId], ref: 'Client', default: [] })
  targetClients?: Types.ObjectId[];

  @Prop({ default: 1 })
  usagePerUser?: number;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  usageHistory?: { userId: Types.ObjectId; usedAt: Date }[];

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: null })
  usageLimit?: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
