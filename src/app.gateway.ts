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

  // ==================== LIFECYCLE HOOKS ====================

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway initialized');
    server.engine.on('connection_error', (err) => {
      this.logger.error(
        `❌ Connection error: ${err.req?.url} | Code: ${err.code} | Message: ${err.message}`,
      );
    });
  }

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.query.userId as string;
      const type = client.handshake.query.type as 'partner' | 'client';

      this.logger.log(
        `🔌 New connection | Socket: ${client.id} | User: ${userId} | Type: ${type}`,
      );

      if (!userId || !type) {
        this.logger.warn(
          `⚠️ Connection rejected | Socket: ${client.id} | Missing userId or type`,
        );
        return;
      }

      client.data.userId = userId;
      client.data.type = type;

      if (type === 'partner') {
        await this.userService.updatePartnerProfile(userId, { isOnline: true });
        client.join(`partner_${userId}`);
        this.logger.log(`✅ Partner online | User: ${userId}`);
      } else if (type === 'client') {
        client.join(`client_${userId}`);
        this.logger.log(`✅ Client connected | User: ${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Connection error | Socket: ${client.id} | Error: ${error.message}`,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { userId, type } = client.data;

      this.logger.log(
        `🔌 Disconnection | Socket: ${client.id} | User: ${userId} | Type: ${type}`,
      );

      if (type === 'partner' && userId) {
        await this.userService.updatePartnerProfile(userId, {
          isOnline: false,
        });
        this.logger.log(`❌ Partner offline | User: ${userId}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Disconnection error | Socket: ${client.id} | Error: ${error.message}`,
      );
    }
  }

  // ==================== ORDER EVENTS ====================

  @OnEvent('order.created')
  handleNewOrder(payload: { order: OrderDocument; onlineUserIds: string[] }) {
    const { order, onlineUserIds } = payload;
    this.logger.log(
      `📦 New order created | Order: ${order._id} | Notifying ${onlineUserIds.length} partners`,
    );

    onlineUserIds.forEach((profileId) => {
      const id = profileId.toString ? profileId.toString() : profileId;
      this.server.to(`partner_${id}`).emit('new_order', order);
    });
  }

  @OnEvent('order.addApplicant')
  handleAddApplicant(payload: { clientId: string[] }) {
    const { clientId } = payload;
    this.logger.log(`📝 Add applicant | Client: ${clientId}`);
    this.server.to(`client_${clientId}`).emit('order_addApplicant', clientId);
  }

  @OnEvent('order.selectApplicant')
  handleSelectApplicant(payload: { partnerId: string; appointment: string }) {
    const { partnerId, appointment } = payload;
    this.logger.log(
      `✅ Applicant selected | Partner: ${partnerId} | Appointment: ${appointment}`,
    );
    this.server
      .to(`partner_${partnerId}`)
      .emit('select_applicant', appointment);
  }

  // ==================== CHAT EVENTS ====================

  @OnEvent('chat.sendMessage')
  handleSendMessage(dto: SendMessageDto) {
    const { roomId, receiverId, senderType, orderId } = dto;
    const receiverRoom =
      senderType === 'client'
        ? `partner_${receiverId}`
        : `client_${receiverId}`;

    this.logger.log(
      `💬 New message | Room: ${roomId} | To: ${receiverId} (${senderType === 'client' ? 'partner' : 'client'})`,
    );

    this.server.to(receiverRoom).emit('chat.newMessage', {
      roomId,
      orderId,
    });
  }

  // ==================== APPOINTMENT EVENTS ====================

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
      this.logger.log(`📅 Appointment updated | Partner: ${partnerId}`);
    }

    if (clientId) {
      this.server
        .to(`client_${clientId}`)
        .emit('appointment_updated', appointment);
      this.logger.log(`📅 Appointment updated | Client: ${clientId}`);
    }
  }

  @OnEvent('appointment.updateComplete')
  handleAppointmentComplete(payload) {
    const { appointment } = payload;
    this.logger.log(
      `✅ Appointment completed | Client: ${appointment.clientId}`,
    );
    this.server
      .to(`client_${appointment.clientId}`)
      .emit('appointment.updateComplete', appointment);
  }

  @OnEvent('appointment.updateToCancel')
  handleAppointmentCancel(payload) {
    const clientId = payload?.appointment?.clientId;
    this.logger.log(`❌ Appointment cancelled | Client: ${clientId}`);
    this.server
      .to(`client_${clientId}`)
      .emit('appointment.updateToCancel', payload.appointment);
  }

  // ==================== LOCATION EVENTS ====================

  @OnEvent('location.update')
  handlePartnerLocationUpdate(payload: {
    clientId: string;
    partnerId: string;
    latitude: number;
    longitude: number;
  }) {
    this.logger.log(
      `📍 Location update | Partner: ${payload.partnerId} → Client: ${payload.clientId}`,
    );

    this.server
      .to(`client_${payload.clientId}`)
      .emit('partner.locationUpdate', {
        partnerId: payload.partnerId,
        latitude: payload.latitude,
        longitude: payload.longitude,
      });
  }

  // ==================== TRANSACTION EVENTS ====================

  @OnEvent('transaction.topUpSuccess')
  handleTopUpSuccess(payload: {
    userId: string;
    amount: number;
    newBalance: number;
    timestamp: number;
  }) {
    const { userId, amount, newBalance, timestamp } = payload;
    this.logger.log(
      `💰 Top-up success | User: ${userId} | Amount: ${amount} | New balance: ${newBalance}`,
    );

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
    this.logger.log(
      `💳 Payment success | Appointment: ${appointmentId} | Partner: ${partnerId} | Amount: ${amount}`,
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

  // ==================== CALL HANDLING ====================

  @SubscribeMessage('call.request')
  handleCallRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
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
      this.logger.warn(
        `⚠️ Invalid call.request | Socket: ${client.id} | Missing userId`,
      );
      return;
    }

    this.logger.log(
      `📞 Call request | From: ${from_userId} (${role_Call}) → To: ${to_userId}`,
    );

    if (role_Call === 'client') {
      this.server.to(`partner_${to_userId}`).emit('call.incoming', payload);
    } else if (role_Call === 'partner') {
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
    this.logger.log(`📞 Call cancelled | To: ${to} | Role: ${role}`);

    if (role === 'client') {
      this.server.to(`partner_${to}`).emit('call.request_cancel', {});
    } else if (role === 'partner') {
      this.server.to(`client_${to}`).emit('call.request_cancel', {});
    } else {
      this.logger.warn(`⚠️ Unknown role: ${role}`);
    }
  }

  @SubscribeMessage('call.decline')
  handleDeclineCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { to, role } = payload;
    this.logger.log(`📞 Call declined | To: ${to} | Role: ${role}`);

    if (role === 'client') {
      this.server.to(`client_${to}`).emit('call.declined', {});
    } else if (role === 'partner') {
      this.server.to(`partner_${to}`).emit('call.declined', {});
    } else {
      this.logger.warn(`⚠️ Unknown role: ${role}`);
    }
  }

  @SubscribeMessage('call.accept')
  handleCallAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { from_userId, to_userId, to_role } = payload;

    if (!from_userId || !to_userId) {
      this.logger.warn(
        `⚠️ Invalid call.accept | Payload: ${JSON.stringify(payload)}`,
      );
      return;
    }

    this.logger.log(
      `📞 Call accepted | From: ${from_userId} → To: ${to_userId} (${to_role})`,
    );

    const acceptPayload = {
      from_userId,
      to_userId,
      to_role,
      timestamp: new Date(),
    };

    if (to_role === 'partner') {
      this.server
        .to(`partner_${to_userId}`)
        .emit('call.accepted', acceptPayload);
    } else if (to_role === 'client') {
      this.server
        .to(`client_${to_userId}`)
        .emit('call.accepted', acceptPayload);
    } else {
      this.logger.warn(`⚠️ Unknown to_role: ${to_role}`);
    }
  }

  @SubscribeMessage('call.end')
  handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const { from_userId, to_userId } = payload;
    this.logger.log(`📞 Call ended | From: ${from_userId} | To: ${to_userId}`);

    this.server.to(`client_${from_userId}`).emit('call.ended', payload);
    this.server.to(`client_${to_userId}`).emit('call.ended', payload);
    this.server.to(`partner_${from_userId}`).emit('call.ended', payload);
    this.server.to(`partner_${to_userId}`).emit('call.ended', payload);
  }

  // ==================== WEBRTC SIGNALING ====================

  @SubscribeMessage('webrtc.offer')
  handleOffer(client: Socket, payload: any) {
    const { to_userId, to_role } = payload;
    this.logger.log(`🔄 WebRTC offer | To: ${to_userId} (${to_role})`);

    if (to_role === 'partner') {
      this.server.to(`partner_${to_userId}`).emit('webrtc.offer', payload);
    } else if (to_role === 'client') {
      this.server.to(`client_${to_userId}`).emit('webrtc.offer', payload);
    } else {
      this.logger.warn(`⚠️ Unknown to_role: ${to_role}`);
    }
  }

  @SubscribeMessage('webrtc.answer')
  handleAnswer(client: Socket, payload: any) {
    const { to_userId, to_role } = payload;
    this.logger.log(`🔄 WebRTC answer | To: ${to_userId} (${to_role})`);

    if (to_role === 'partner') {
      this.server.to(`partner_${to_userId}`).emit('webrtc.answer', payload);
    } else if (to_role === 'client') {
      this.server.to(`client_${to_userId}`).emit('webrtc.answer', payload);
    } else {
      this.logger.warn(`⚠️ Unknown to_role: ${to_role}`);
    }
  }

  @SubscribeMessage('webrtc.ice-candidate')
  handleIceCandidate(client: Socket, payload: any) {
    const { to_userId, to_role } = payload;
    this.logger.log(`🔄 WebRTC ICE candidate | To: ${to_userId} (${to_role})`);

    if (to_role === 'partner') {
      this.server
        .to(`partner_${to_userId}`)
        .emit('webrtc.ice-candidate', payload);
    } else if (to_role === 'client') {
      this.server
        .to(`client_${to_userId}`)
        .emit('webrtc.ice-candidate', payload);
    } else {
      this.logger.warn(`⚠️ Unknown to_role: ${to_role}`);
    }
  }
}
