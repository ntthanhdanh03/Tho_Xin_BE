import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, index: true })
  roomId: string;

  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true, enum: ['client', 'partner'] })
  senderType: 'client' | 'partner';

  @Prop({ required: true })
  receiverId: string;

  @Prop()
  content?: string;

  @Prop({ default: 'text', enum: ['text', 'image'] })
  type: 'text' | 'image';

  @Prop()
  imageUrl?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
