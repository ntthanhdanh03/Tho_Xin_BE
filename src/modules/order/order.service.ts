import { ChatRoomService } from '../chat/chat.service';
import { NotificationService } from '../notication/notification.service';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
  OrderType,
} from 'src/schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddApplicantDto } from './dto/add-applicant.dto';
import { PartnerKYC, PartnerKYCDocument } from 'src/schemas/partner-kyc.schema';
import {
  Installation,
  InstallationDocument,
} from 'src/schemas/create-installation.schema';
import {
  PartnerProfile,
  PartnerProfileDocument,
} from 'src/schemas/partner-profile.schema';
// import { AppointmentService } from '../appointment/appointment.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentService } from '../appointment/appointment.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(PartnerKYC.name)
    private partnerKYCModel: Model<PartnerKYCDocument>,
    @InjectModel(PartnerProfile.name)
    private partnerProfileModel: Model<PartnerProfileDocument>,
    @InjectModel(Installation.name)
    private installationModel: Model<InstallationDocument>,
    private readonly notificationService: NotificationService,
    private readonly ChatRoomService: ChatRoomService,
    private readonly appointmentService: AppointmentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  private async saveOrder(orderData: any): Promise<OrderDocument> {
    const createdOrder = new this.orderModel(orderData);
    return createdOrder.save();
  }

  async createOrder(orderData: any) {
    const existingPendingOrder = await this.orderModel.findOne({
      clientId: orderData.clientId,
      status: OrderStatus.PENDING,
    });

    if (existingPendingOrder) {
      throw new BadRequestException('Bạn đang có một dịch vụ chờ xử lý.');
    }
    const order = await this.saveOrder(orderData);

    const typeService = order.typeService;

    const FIELD = [
      { key: 'electricity', name: 'Điện' },
      { key: 'water', name: 'Nước' },
      { key: 'locksmith', name: 'Khóa' },
      { key: 'air_conditioning', name: 'Điện lạnh' },
    ];

    const serviceField =
      FIELD.find((f) => f.key === typeService)?.name || typeService;

    try {
      const partnersKYC = await this.partnerKYCModel.find({
        choseField: typeService,
        // approved: 'APPROVED',
      });

      if (!partnersKYC.length) {
        return order;
      }

      const userIds = partnersKYC.map((p) => p.userId);

      const onlinePartners = await this.partnerProfileModel.find({
        userId: { $in: userIds },
        isOnline: true,
        isLock: false,
      });

      if (!onlinePartners.length) {
        return order;
      }

      const onlineUserIds = onlinePartners.map((p) => p.userId);

      this.eventEmitter.emit('order.created', {
        order,
        onlineUserIds,
      });

      const installations = await this.installationModel.find({
        idUsers: { $in: onlineUserIds },
      });

      const tokens: string[] = [];
      installations.forEach((inst) => {
        inst.deviceToken.forEach((dt) => {
          if (dt.token) tokens.push(dt.token);
        });
      });

      const message = `Có yêu cầu mới về ${serviceField}, hãy kiểm tra ngay!`;

      for (const token of tokens) {
        await this.notificationService.sendPushNotification(
          token,
          'Đơn hàng mới',
          message,
        );
      }
    } catch (error) {
      console.error('Lỗi khi gửi notification:', error);
    }

    return order;
  }

  async addApplicant(
    orderId: string,
    dto: AddApplicantDto,
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId);

    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(
        'Không thể báo giá cho đơn đã hoàn thành hoặc đã huỷ',
      );
    }

    if (order.typeOder !== OrderType.SELECT) {
      throw new BadRequestException('Đơn hàng không hỗ trợ chọn thợ');
    }

    const exists = order.applicants.some(
      (a) => a.partnerId.toString() === dto.partnerId,
    );
    if (exists) {
      throw new BadRequestException('Bạn đã báo giá đơn này rồi');
    }

    let chatRoomId: string | null = null;
    try {
      const chatRoom = await this.ChatRoomService.create(
        order._id.toString(),
        order.clientId.toString(),
        dto.partnerId,
      );
      chatRoomId = chatRoom?._id?.toString();
    } catch (err) {
      console.error('❌ Không thể tạo phòng chat:', err);
    }

    order.applicants.push({
      partnerId: new Types.ObjectId(dto.partnerId),
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      offeredPrice: dto.offeredPrice,
      note: dto.note,
      roomId: chatRoomId ? new Types.ObjectId(chatRoomId) : undefined,
    });

    const installations = await this.installationModel.find({
      idUsers: { $in: [order.clientId] },
    });

    const tokens: string[] = [];
    installations.forEach((inst) => {
      inst.deviceToken.forEach((dt) => {
        if (dt.token) tokens.push(dt.token);
      });
    });

    const message = `Đã có thợ báo giá cho yêu cầu của bạn, hãy kiểm tra ngay!`;

    for (const token of tokens) {
      await this.notificationService.sendPushNotification(
        token,
        'Đơn hàng mới',
        message,
      );
    }

    this.eventEmitter.emit('order.addApplicant', {
      clientId: order.clientId,
    });
    return order.save();
  }

  async cancelApplicant(
    orderId: string,
    partnerId: string,
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId);

    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException(
        'Không thể hủy ứng viên của đơn đã hoàn thành hoặc đã hủy',
      );
    }

    const applicantIndex = order.applicants.findIndex(
      (a) => a.partnerId.toString() === partnerId,
    );

    if (applicantIndex === -1) {
      throw new NotFoundException('Applicant not found');
    }

    const chatRoomId = order.applicants[applicantIndex]?.roomId;

    order.applicants.splice(applicantIndex, 1);

    const savedOrder = await order.save();

    if (chatRoomId) {
      await this.ChatRoomService.deleteByOrderAndPartner(orderId, partnerId);
    }

    return savedOrder;
  }

  async selectApplicant(
    orderId: string,
    partnerId: string,
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId);

    // Không cho chọn lại nếu đã hoàn thành hoặc hủy
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException('Cannot select applicant for this order');
    }

    // Tìm thợ được chọn trong danh sách applicants
    const applicant = order.applicants.find(
      (a) => a.partnerId.toString() === partnerId,
    );
    if (!applicant) throw new NotFoundException('Applicant not found');

    // Cập nhật trạng thái đơn
    order.status = OrderStatus.PROCESSING;
    // Chỉ giữ lại thợ đã chọn
    order.applicants = [applicant];

    const savedOrder = await order.save();

    // ✅ Tạo Appointment tương ứng
    await this.appointmentService.create({
      orderId: savedOrder._id as Types.ObjectId,
      clientId: savedOrder.clientId as Types.ObjectId,
      partnerId: applicant.partnerId as Types.ObjectId,
      roomId: applicant.roomId as Types.ObjectId, // ✅ lấy đúng roomId trong applicant
    });

    // Emit event cho thợ biết rằng họ đã được chọn
    this.eventEmitter.emit('order.selectApplicant', {
      partnerId: applicant.partnerId.toString(),
      appointment: savedOrder,
    });

    return savedOrder;
  }

  async getOrders(clientId?: string): Promise<OrderDocument[]> {
    const query = clientId ? { clientId } : {};
    return this.orderModel.find(query).exec();
  }

  async getOrdersByClient(clientId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ clientId }).exec();
  }

  async getOrdersByTypes(types: string[]): Promise<OrderDocument[]> {
    if (!types || types.length === 0) return [];
    return this.orderModel.find({ typeService: { $in: types } }).exec();
  }
  async getOrderById(id: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<OrderDocument> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
