import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from 'src/schemas/chat-room.schema';
import { Message, MessageDocument } from 'src/schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from '../notication/notification.service';
import {
  Installation,
  InstallationDocument,
} from 'src/schemas/create-installation.schema';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Installation.name)
    private installationModel: Model<InstallationDocument>,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(orderId: string, clientId: string, partnerId: string) {
    const created = await this.chatRoomModel.create({
      orderId,
      clientId,
      partnerId,
    });

    return created.toObject ? created.toObject() : created;
  }

  async findById(roomId: string) {
    return this.chatRoomModel.findById(roomId).lean().exec();
  }

  async findByOrder(orderId: string) {
    return this.chatRoomModel.find({ orderId }).lean().exec();
  }

  async sendMessage(dto: SendMessageDto) {
    console.log('➡️ Bắt đầu gửi tin nhắn với DTO:', dto);

    // Lưu tin nhắn vào DB trước
    const result = await this.messageModel.create(dto);
    console.log('✅ Đã lưu tin nhắn');

    // Emit event sau khi lưu xong
    this.eventEmitter.emit('chat.sendMessage', result);

    // Tìm installations của user
    const installations = await this.installationModel.find({
      idUsers: dto.receiverId,
    });

    // Thu thập device tokens
    const tokens: string[] = [];
    installations.forEach((inst) => {
      inst.deviceToken.forEach((dt) => {
        if (dt.token) tokens.push(dt.token);
      });
    });

    console.log(`🎯 Tìm thấy ${tokens.length} device tokens`);

    // Gửi push notifications
    const message = `Có một tin nhắn từ Thợ, hãy kiểm tra ngay!`;
    for (const token of tokens) {
      try {
        await this.notificationService.sendPushNotification(
          token,
          'Đơn hàng mới',
          message,
        );
      } catch (error) {
        console.error(`❌ Lỗi gửi notification tới ${token}:`, error.message);
      }
    }

    return result;
  }

  async getMessagesByOrder(orderId: string) {
    const messages = await this.messageModel.find({ orderId });
    console.log(`Fetched messages for orderId=${orderId}:`, messages);
    return messages;
  }
}
