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
      const partnerId = client.handshake.query.partnerId as string;
      this.logger.log(`   - Socket ID: ${client.id}`);
      this.logger.log(`   - Partner ID: ${partnerId}`);
      if (partnerId) {
        client.data.partnerId = partnerId;
        await this.userService.updatePartnerProfile(partnerId, {
          isOnline: true,
        });
        this.server.emit('partner_online', { partnerId });
        this.logger.log(`✅ Partner ${partnerId} is now online`);
        client.join(`partner_${partnerId}`);
      } else {
        this.logger.warn('⚠️ Connection without partnerId');
      }
    } catch (error) {
      this.logger.error('❌ Error in handleConnection:', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const partnerId = client.data.partnerId;

      this.logger.log(`🔌 Disconnection:`);
      this.logger.log(`   - Socket ID: ${client.id}`);
      this.logger.log(`   - Partner ID: ${partnerId}`);

      if (partnerId) {
        // Cập nhật trạng thái offline
        await this.userService.updatePartnerProfile(partnerId, {
          isOnline: false,
        });

        // Emit sự kiện partner offline
        this.server.emit('partner_offline', { partnerId });

        this.logger.log(`❌ Partner ${partnerId} is now offline`);
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
}
