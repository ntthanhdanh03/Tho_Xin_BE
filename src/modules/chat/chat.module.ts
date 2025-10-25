import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatController } from './chat.controller';
import { ChatRoom, ChatRoomSchema } from 'src/schemas/chat-room.schema';
import { Message, MessageSchema } from 'src/schemas/message.schema';
import { ChatRoomService } from './chat.service';
import { NotificationModule } from '../notification/notification.module';
import {
  Installation,
  InstallationSchema,
} from 'src/schemas/create-installation.schema';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatRoom.name, schema: ChatRoomSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Installation.name, schema: InstallationSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    NotificationModule,
    AIModule,
  ],
  providers: [ChatRoomService],
  controllers: [ChatController],
  exports: [ChatRoomService],
})
export class ChatModule {}
