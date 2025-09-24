import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true, enum: ['client', 'partner'] })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false, default: '' })
  fullName?: string;

  @Prop({ required: false, default: '' })
  avatarUrl?: string;

  @Prop({ enum: ['male', 'female'], default: null })
  gender: string;

  @Prop({ required: false, default: null })
  dateOfBirth: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ phoneNumber: 1, role: 1 }, { unique: true });
