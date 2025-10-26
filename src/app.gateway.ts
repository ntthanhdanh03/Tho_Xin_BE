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
    });
  }

  @OnEvent('order.addApplicant')
  handleAddApplicant(payload: { clientId: string[] }) {
    const { clientId } = payload;
    this.server.to(`client_${clientId}`).emit('order_addApplicant', clientId);
  }

  @OnEvent('order.selectApplicant')
  handleSelectApplicant(payload: { partnerId: string; appointment: string }) {
    const { partnerId, appointment } = payload;
    this.server
      .to(`partner_${partnerId}`)
      .emit('select_applicant', appointment);
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
  }

  @OnEvent('appointment.UpdateStatus')
  handleAppointmentUpdate(payload: {
    clientId?: string;
    partnerId?: string;
    appointment: any;
  }) {
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

  @OnEvent('appointment.updateToCancel')
  handleAppointmentCancel(payload) {
    const { clientId } = payload;
    this.server.to(`client_${clientId}`).emit('appointment.updateToCancel');
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
  }

  @OnEvent('transaction.topUpSuccess')
  handleTopUpSuccess(payload: {
    userId: string;
    amount: number;
    newBalance: number;
    timestamp: number;
  }) {
    const { userId, amount, newBalance, timestamp } = payload;
    this.server.to(`partner_${userId}`).emit('transaction.top_up.success', {
      amount,
      newBalance,
      timestamp,
      message: 'Nạp tiền thành công!',
    });
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

    this.server
      .to(`partner_${partnerId}`)
      .emit('transaction.paid_appointment.success', {
        appointmentId,
        amount,
        timestamp,
        message: 'Thanh toán hoàn tất!',
      });
  }

  @SubscribeMessage('call.request')
  handleCallRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    this.logger.log(
      `📞 Received call.request from ${client.id}: ${JSON.stringify(payload)}`,
    );

    const {
      role_Call,
      from_userId,
      form_name,
      form_avatar,
      to_userId,
      to_name,
      to_avatar,
    } = payload;

    if (!to_userId || !from_userId) {
      this.logger.warn('⚠️ call.request missing required fields');
      return;
    }

    if (role_Call === 'client') {
      this.logger.log(`📤 Client ${from_userId} gọi tới Partner ${to_userId}`);
      this.server.to(`partner_${to_userId}`).emit('call.incoming', payload);
    } else if (role_Call === 'partner') {
      this.logger.log(`📤 Partner ${from_userId} gọi tới Client ${to_userId}`);
      this.server.to(`client_${to_userId}`).emit('call.incoming', payload);
    } else {
      this.logger.warn(`⚠️ Unknown role_Call: ${role_Call}`);
    }
  }

  @SubscribeMessage('call.request_cancel')
  handleCallRequestCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { to, role } = payload;
    if (role === 'client') {
      this.logger.log(`📤 Client gọi tới Partner ${to}`);
      this.server.to(`partner_${to}`).emit('call.request_cancel', {});
    } else if (role === 'partner') {
      this.logger.log(`📤 Partner gọi tới Client ${to}`);
      this.server.to(`client_${to}`).emit('call.request_cancel', {});
    } else {
      this.logger.warn(`⚠️ Unknown role_Call: ${role}`);
    }
  }

  @SubscribeMessage('call.decline')
  handleDeclineCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { to, role } = payload;
    this.logger.log(
      `📞 call.decline from ${client.id}: ${JSON.stringify(payload)}`,
    );
    if (role === 'client') {
      this.logger.log(`📤 Client gọi tới Partner ${to}`);
      this.server.to(`partner_${to}`).emit('call.declined', {});
    } else if (role === 'partner') {
      this.logger.log(`📤 Partner gọi tới Client ${to}`);
      this.server.to(`client_${to}`).emit('call.declined', {});
    } else {
      this.logger.warn(`⚠️ Unknown role_Call: ${role}`);
    }
  }

  @SubscribeMessage('call.accept')
  handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { from_userId, to_userId, to_role } = payload;

    this.logger.log(
      `📞 call.accept from ${from_userId} (to_role=${to_role}) -> to ${to_userId}`,
    );

    if (!from_userId || !to_userId) {
      this.logger.warn(
        `⚠️ Invalid call.accept payload: ${JSON.stringify(payload)}`,
      );
      return;
    }

    if (to_role === 'partner') {
      this.server.to(`partner_${to_userId}`).emit('call.accepted', {
        from_userId,
        to_userId,
        to_role,
        timestamp: new Date(),
      });
    } else if (to_role === 'client') {
      this.server.to(`client_${to_userId}`).emit('call.accepted', {
        from_userId,
        to_userId,
        to_role,
        timestamp: new Date(),
      });
    } else {
      this.logger.warn(`⚠️ Unknown role in call.accept: ${to_role}`);
    }
  }

  @SubscribeMessage('call.end')
  handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { from_userId, to_userId } = payload;
    this.server.to(`client_${from_userId}`).emit('call.ended', payload);
    this.server.to(`client_${to_userId}`).emit('call.ended', payload);
    this.server.to(`partner_${from_userId}`).emit('call.ended', payload);
    this.server.to(`partner_${to_userId}`).emit('call.ended', payload);
  }

  @SubscribeMessage('webrtc.offer')
  handleOffer(client: Socket, payload: any) {
    console.log('📡 Offer từ', payload.from_userId, '->', payload.to_userId);
    this.server
      .to(`partner_${payload.to_userId}`)
      .emit('webrtc.offer', payload);
  }

  @SubscribeMessage('webrtc.answer')
  handleAnswer(client: Socket, payload: any) {
    console.log('📡 Answer từ', payload.from_userId, '->', payload.to_userId);
    this.server
      .to(`client_${payload.to_userId}`)
      .emit('webrtc.answer', payload);
  }

  @SubscribeMessage('webrtc.ice-candidate')
  handleIceCandidate(client: Socket, payload: any) {
    this.logger.log(`webrtc.ice-candidate ${JSON.stringify(payload)}`);

    const { to_userId, candidate, to_role } = payload;

    if (to_role === 'partner') {
      this.server
        .to(`partner_${to_userId}`)
        .emit('webrtc.ice-candidate', payload);
    } else if (to_role === 'client') {
      this.server
        .to(`client_${to_userId}`)
        .emit('webrtc.ice-candidate', payload);
    } else {
      this.logger.warn(`⚠️ Unknown role in call.accept: ${to_role}`);
    }

    this.server
      .to(`client_${payload.to_userId}`)
      .emit('webrtc.ice-candidate', payload);
  }
}
