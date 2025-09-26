import { NotificationService } from './../notication/notification.service';
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
    private readonly eventEmitter: EventEmitter2,
  ) {}
  private async saveOrder(orderData: any): Promise<OrderDocument> {
    const createdOrder = new this.orderModel(orderData);
    return createdOrder.save();
  }

  async createOrder(orderData: any) {
    console.log('Bắt đầu tạo order với data:', orderData);

    // Lưu order vào database
    const order = await this.saveOrder(orderData);
    console.log('Order đã được lưu:', order);

    const typeService = order.typeService;
    console.log('Type service của order:', typeService);

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
        console.log('Không có partner KYC nào phù hợp');
        return order;
      }

      const userIds = partnersKYC.map((p) => p.userId);
      console.log('UserIds partner KYC phù hợp:', userIds);

      const onlinePartners = await this.partnerProfileModel.find({
        userId: { $in: userIds },
        isOnline: true,
        isLock: false,
      });

      if (!onlinePartners.length) {
        console.log('Không có partner online');
        return order;
      }

      const onlineUserIds = onlinePartners.map((p) => p.userId);
      console.log('UserIds partner online:', onlineUserIds);

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

      console.log('Tổng số token sẽ gửi:', tokens.length);

      const message = `Có yêu cầu mới về ${serviceField}, hãy kiểm tra ngay!`;

      for (const token of tokens) {
        console.log('Gửi notification tới token:', token);
        await this.notificationService.sendPushNotification(
          token,
          'Đơn hàng mới',
          message,
        );
      }

      console.log('Đã gửi xong tất cả notification');
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
        'Cannot apply to a completed or cancelled order',
      );
    }

    if (order.typeOder !== OrderType.SELECT) {
      throw new BadRequestException(
        'Cannot add applicants to non-select order',
      );
    }

    const exists = order.applicants.some(
      (a) => a.partnerId.toString() === dto.partnerId,
    );
    if (exists) {
      throw new BadRequestException('Partner has already applied');
    }

    order.applicants.push({
      partnerId: new Types.ObjectId(dto.partnerId),
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      offeredPrice: dto.offeredPrice,
      note: dto.note,
    });
    const installations = await this.installationModel.find({
      idUsers: { $in: order.clientId },
    });

    const tokens: string[] = [];
    installations.forEach((inst) => {
      inst.deviceToken.forEach((dt) => {
        if (dt.token) tokens.push(dt.token);
      });
    });

    const message = `Đã có thợ báo giá cho yêu cầu của bạn, hãy kiểm tra ngay!`;

    for (const token of tokens) {
      console.log('Gửi notification tới token:', token);
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

  async selectApplicant(
    orderId: string,
    partnerId: string,
  ): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId);

    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException('Cannot select applicant for this order');
    }

    const applicant = order.applicants.find(
      (a) => a.partnerId.toString() === partnerId,
    );
    if (!applicant) throw new NotFoundException('Applicant not found');

    // Update order status và chỉ giữ applicant đã chọn
    order.status = OrderStatus.COMPLETED;
    order.applicants = [applicant];

    const savedOrder = await order.save();

    // await this.appointmentService.createAppointment({
    //   orderId: savedOrder._id.toString(),
    //   clientId: savedOrder.clientId,
    //   partnerId: applicant.partnerId.toString(),
    //   dateTime: savedOrder.dateTimeOder,
    // });

    return savedOrder;
  }

  /** Hủy order */
  async cancelOrder(orderId: string): Promise<OrderDocument> {
    const order = await this.getOrderById(orderId);

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed order');
    }

    order.status = OrderStatus.CANCELLED;
    return order.save();
  }

  /** Lấy tất cả order theo client */
  async getOrdersByClient(clientId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ clientId }).exec();
  }

  /** Lấy tất cả order theo partner */
  async getOrdersByPartner(partnerId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ 'applicants.partnerId': partnerId }).exec();
  }

  async getOrders(clientId?: string): Promise<OrderDocument[]> {
    const query = clientId ? { clientId } : {};
    return this.orderModel.find(query).exec();
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
