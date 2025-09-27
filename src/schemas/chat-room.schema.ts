import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

@Schema({ timestamps: true })
export class ChatRoom {
  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ required: true, index: true })
  clientId: string;

  @Prop({ required: true, index: true })
  partnerId: string;

  @Prop({ default: true })
  active: boolean;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
