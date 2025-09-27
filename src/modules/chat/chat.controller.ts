import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { SendMessageDto } from './dto/send-message.dto';
import { ChatRoomService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Post('room')
  async createRoom(@Body() dto: CreateChatRoomDto) {
    return this.chatRoomService.create(
      dto.orderId,
      dto.clientId,
      dto.partnerId,
    );
  }

  @Get('room/:orderId')
  async getRoomsByOrder(@Param('orderId') orderId: string) {
    return this.chatRoomService.findByOrder(orderId);
  }

  @Post('message')
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.chatRoomService.sendMessage(dto);
  }

  @Get('message/:orderId')
  async getMessages(@Param('orderId') orderId: string) {
    return this.chatRoomService.getMessagesByOrder(orderId);
  }
}
