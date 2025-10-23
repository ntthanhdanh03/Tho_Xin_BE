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
    this.server.to(`client_${clientId}`).emit('order_addApplicant', clientId);
    this.logger.log(`📦 Sent new_order to client_${clientId}`);
  }

  @OnEvent('order.selectApplicant')
  handleSelectApplicant(payload: { partnerId: string; appointment: string }) {
    console.log('📩 [order.selectApplicant] Event nhận được:', payload);

    const { partnerId, appointment } = payload;
    this.server
      .to(`partner_${partnerId}`)
      .emit('select_applicant', appointment);

    console.log(`✅ Đã emit 'select_applicant' cho partner_${partnerId}`);
  }

  @OnEvent('chat.sendMessage')
  handleSendMessage(dto: SendMessageDto) {
    const { roomId, receiverId, senderType, orderId } = dto;

    const receiverRoom =
      senderType === 'client'
        ? `partner_${receiverId}`
        : `client_${receiverId}`;

    const messagePayload = {
      roomId,
      orderId,
    };

    this.server.to(receiverRoom).emit('chat.newMessage', messagePayload);
    this.logger.log(`📨 Sent message to ${receiverRoom}`);
  }

  @OnEvent('appointment.UpdateStatus')
  handleAppointmentUpdate(payload: {
    clientId?: string;
    partnerId?: string;
    appointment: any;
  }) {
    console.log('📩 [appointment.UpdateStatus] Event nhận được:', payload);

    const { clientId, partnerId, appointment } = payload;

    if (partnerId) {
      this.server
        .to(`partner_${partnerId}`)
        .emit('appointment_updated', appointment);
      console.log(`✅ Đã emit tới partner_${partnerId}`);
    }

    if (clientId) {
      this.server
        .to(`client_${clientId}`)
        .emit('appointment_updated', appointment);
      console.log(`✅ Đã emit tới client_${clientId}`);
    }
  }

  @OnEvent('appointment.updateComplete')
  handleAppointmentComplete(payload) {
    const { appointment } = payload;

    this.server
      .to(`client_${appointment.clientId}`)
      .emit('appointment.updateComplete', appointment);
  }

  @OnEvent('location.update')
  handlePartnerLocationUpdate(payload: {
    clientId: string;
    partnerId: string;
    latitude: number;
    longitude: number;
  }) {
    console.log('📡 Received location update event:', payload);

    this.server
      .to(`client_${payload.clientId}`)
      .emit('partner.locationUpdate', {
        partnerId: payload.partnerId,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });

    console.log(`📤 Emitted location to client_${payload.clientId}:`, {
      partnerId: payload.partnerId,
      latitude: payload.latitude,
      longitude: payload.longitude,
    });
  }
  @OnEvent('transaction.topUpSuccess')
  handleTopUpSuccess(payload: {
    userId: string;
    amount: number;
    newBalance: number;
    timestamp: number;
  }) {
    this.logger.log('💰 [transaction.topUpSuccess] Event nhận được:', payload);

    const { userId, amount, newBalance, timestamp } = payload;
    this.server.to(`partner_${userId}`).emit('transaction.top_up.success', {
      amount,
      newBalance,
      timestamp,
      message: 'Nạp tiền thành công!',
    });
    this.logger.log(
      `✅ Đã emit 'topup_success' tới partner_${userId} - Số dư mới: ${newBalance}`,
    );
  }

  @OnEvent('transaction.paid_appointment.success')
  handlePaidAppointmentSuccess(payload: {
    appointmentId: string;
    clientId: string;
    partnerId: string;
    amount: number;
    timestamp: number;
  }) {
    const { appointmentId, clientId, partnerId, amount, timestamp } = payload;

    this.logger.log(
      '💰 [transaction.paid_appointment.success] Event nhận được:',
      payload,
    );

    this.server
      .to(`partner_${partnerId}`)
      .emit('transaction.paid_appointment.success', {
        appointmentId,
        amount,
        timestamp,
        message: 'Thanh toán hoàn tất!',
      });
  }
}
