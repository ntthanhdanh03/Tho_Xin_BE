import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from './modules/user/user.service';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderDocument } from './schemas/order.schema';
import { SendMessageDto } from './modules/chat/dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('AppGateway');

  constructor(private readonly userService: UserService) {}

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized');
    server.engine.on('connection_error', (err) => {
      this.logger.error(
        '❌ Connection error:',
        err.req?.url,
        err.code,
        err.message,
      );
    });
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;
      const type = client.handshake.query.type as 'partner' | 'client';

      this.logger.log(`   - Socket ID: ${client.id}`);
      this.logger.log(`   - User ID: ${userId}`);
      this.logger.log(`   - Type: ${type}`);

      if (!userId || !type) {
        this.logger.warn('⚠️ Connection missing userId or type');
        return;
      }

      client.data.userId = userId;
      client.data.type = type;

      if (type === 'partner') {
        await this.userService.updatePartnerProfile(userId, { isOnline: true });
        this.logger.log(`✅ Partner ${userId} is now online`);
        client.join(`partner_${userId}`);
      } else if (type === 'client') {
        this.logger.log(`✅ Client ${userId} connected`);
        client.join(`client_${userId}`);
      }
    } catch (error) {
      this.logger.error('❌ Error in handleConnection:', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { userId, type } = client.data;

      this.logger.log(`🔌 Disconnection: Socket ID ${client.id}, Type ${type}`);

      if (type === 'partner' && userId) {
        await this.userService.updatePartnerProfile(userId, {
          isOnline: false,
        });
        this.logger.log(`❌ Partner ${userId} is now offline`);
      }
    } catch (error) {
      this.logger.error('❌ Error in handleDisconnect:', error);
    }
  }

  @OnEvent('order.created')
  handleNewOrder(payload: { order: OrderDocument; onlineUserIds: string[] }) {
    const { order, onlineUserIds } = payload;
    onlineUserIds.forEach((profileId) => {
      const id = profileId.toString ? profileId.toString() : profileId;
      this.server.to(`partner_${id}`).emit('new_order', order);
      this.logger.log(`📦 Sent new_order to partner_${id}`);
    });
  }

  @OnEvent('order.addApplicant')
  handleAddApplicant(payload: { clientId: string[] }) {
    const { clientId } = payload;
    this.server.to(`client_${clientId}`).emit('order_addApplicant');
    this.logger.log(`📦 Sent new_order to client_${clientId}`);
  }

  @OnEvent('chat.sendMessage')
  handleSendMessage(dto: SendMessageDto) {
    const {
      roomId,
      senderId,
      receiverId,
      senderType,
      content,
      type,
      imageUrl,
      orderId,
    } = dto;

    const receiverRoom =
      senderType === 'client'
        ? `partner_${receiverId}`
        : `client_${receiverId}`;

    const messagePayload = {
      roomId,
      orderId,
    };

    // Gửi socket tới người nhận
    this.server.to(receiverRoom).emit('chat.newMessage', messagePayload);
    this.logger.log(`📨 Sent message to ${receiverRoom}`);
  }
}
