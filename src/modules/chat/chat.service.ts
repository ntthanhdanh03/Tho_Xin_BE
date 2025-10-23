import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from 'src/schemas/chat-room.schema';
import { Message, MessageDocument } from 'src/schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from '../notification/notification.service';
import {
  Installation,
  InstallationDocument,
} from 'src/schemas/create-installation.schema';
import { Order, OrderDocument } from 'src/schemas/order.schema';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Installation.name)
    private installationModel: Model<InstallationDocument>,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getMessagesByApplicant(applicantId: string) {
    const orders = await this.orderModel
      .find({
        status: { $in: ['pending', 'completed'] },
        'applicants.partnerId': new Types.ObjectId(applicantId),
      })
      .lean();

    if (!orders.length) {
      return { rooms: [], messages: [] };
    }

    const orderIds = orders.map((o) => o._id);

    const rooms = await this.chatRoomModel
      .find({ orderId: { $in: orderIds } })
      .lean();

    const messages = await this.messageModel
      .find({ orderId: { $in: orderIds } })
      .lean();

    return {
      rooms,
      messages,
    };
  }

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
    const result = await this.messageModel.create(dto);

    this.eventEmitter.emit('chat.sendMessage', result);

    const installations = await this.installationModel.find({
      idUsers: dto.receiverId,
    });

    const tokens: string[] = [];
    installations.forEach((inst) => {
      inst.deviceToken.forEach((dt) => {
        if (dt.token) tokens.push(dt.token);
      });
    });

    const message = `Có một tin nhắn từ Thợ, hãy kiểm tra ngay!`;
    for (const token of tokens) {
      try {
        await this.notificationService.sendPushNotification(
          token,
          'Tin nhắn mới',
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
    return messages;
  }
  async deleteByOrderAndPartner(orderId: string, partnerId: string) {
    try {
      const deletedRoom = await this.chatRoomModel.findOneAndDelete({
        orderId: new Types.ObjectId(orderId),
        partnerId: new Types.ObjectId(partnerId),
      });

      if (deletedRoom) {
        await this.messageModel.deleteMany({
          orderId: new Types.ObjectId(orderId),
          $or: [
            { senderId: new Types.ObjectId(partnerId) },
            { receiverId: new Types.ObjectId(partnerId) },
          ],
        });
      }

      return deletedRoom;
    } catch (error) {
      console.error('❌ Lỗi khi xóa chatroom:', error);
      throw error;
    }
  }
}
