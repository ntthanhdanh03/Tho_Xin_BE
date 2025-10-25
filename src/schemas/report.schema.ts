import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ required: true })
  message: string;

  @Prop()
  userId?: string;

  @Prop({ default: 'redirect' })
  type: string;

  @Prop()
  reason?: string;

  @Prop({ default: false })
  resolved: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
