import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from 'src/schemas/appointment.schema';
import {
  Installation,
  InstallationDocument,
} from 'src/schemas/create-installation.schema';
import { NotificationService } from '../notication/notification.service';
import { UserService } from '../user/user.service';
import {
  Transaction,
  TransactionDocument,
} from 'src/schemas/transaction.schema';
import { PaidTransactionDocument } from 'src/schemas/paid-transaction.schema';
import { Rate, RateDocument } from 'src/schemas/rate.schema';
import { PromotionService } from '../promotion/promotion.service';

@Injectable()
export class AppointmentService {
  private logger = new Logger('AppointmentService');
  constructor(
    private readonly userService: UserService,
    @InjectModel(Installation.name)
    private readonly installationModel: Model<InstallationDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Rate.name)
    private readonly rateModel: Model<RateDocument>,
    private readonly notificationService: NotificationService,
    private readonly promotionService: PromotionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: {
    orderId: string | Types.ObjectId;
    clientId: string | Types.ObjectId;
    partnerId: string | Types.ObjectId;
    roomId: string | Types.ObjectId;
    agreedPrice?: string;
    laborCost?: string;
    note?: string;
  }): Promise<Appointment> {
    const created = new this.appointmentModel({
      ...data,
      orderId: new Types.ObjectId(data.orderId),
      clientId: new Types.ObjectId(data.clientId),
      partnerId: new Types.ObjectId(data.partnerId),
      roomId: new Types.ObjectId(data.roomId),
    });

    const saved = await created.save();

    const installations = await this.installationModel.find({
      idUsers: { $in: [created.partnerId] },
    });

    const tokens: string[] = [];
    installations.forEach((inst) => {
      console.log('📦 Installation:', inst);
      inst.deviceToken.forEach((dt) => {
        if (dt.token) {
          console.log('✅ Found token:', dt.token);
          tokens.push(dt.token);
        } else {
          console.log('⚠️ DeviceToken object không có token:', dt);
        }
      });
    });

    if (tokens.length === 0) {
      console.log(
        `⚠️ Không tìm thấy token nào cho partnerId: ${data.partnerId}`,
      );
    } else {
      console.log(`📲 Tổng số token cần gửi: ${tokens.length}`);
    }

    const message = `Vui lòng thực hiện yêu cầu mà bạn đã báo giá!`;

    for (const token of tokens) {
      await this.notificationService.sendPushNotification(
        token,
        'Khách hàng đã chấp nhận Báo Giá',
        message,
      );
    }

    this.eventEmitter.emit('order.selectApplicant', {
      partnerId: data.partnerId.toString(),
      appointment: saved._id,
    });

    return saved;
  }

  async update(
    id: string,
    data: Partial<Appointment>,
    type: 'client' | 'partner',
  ): Promise<Appointment> {
    // ✅ Cập nhật thông tin lịch hẹn
    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    // ✅ Nếu có mã khuyến mãi thì tự động áp dụng
    if (data.promotionCode) {
      try {
        console.log('🎟️ Phát hiện có mã khuyến mãi:', data.promotionCode);
        await this.promotionService.applyPromotion(
          id,
          data.promotionCode,
          updated.clientId.toString(),
        );
        console.log('✅ Áp dụng mã khuyến mãi thành công');
      } catch (err) {
        console.warn('⚠️ Áp dụng mã khuyến mãi thất bại:', err.message);
      }
    }

    // ✅ Gửi thông báo realtime + push notification
    const { clientId, partnerId } = updated;
    const targetUserId = type === 'partner' ? clientId : partnerId;
    const receiverType = type === 'partner' ? 'client' : 'partner';

    const installations = await this.installationModel.find({
      idUsers: targetUserId,
    });

    const tokens: string[] = [];

    installations.forEach((inst) => {
      if (inst.deviceToken && Array.isArray(inst.deviceToken)) {
        inst.deviceToken.forEach((dt) => {
          if (dt?.token) tokens.push(dt.token);
        });
      }
    });

    if (tokens.length === 0) {
      console.warn(
        `⚠️ Không tìm thấy token nào cho ${receiverType}Id: ${targetUserId}`,
      );
    } else {
      console.log(`📲 Tổng số token cần gửi: ${tokens.length}`);
    }

    const messageTitle =
      receiverType === 'partner'
        ? 'Khách hàng đã cập nhật trạng thái công việc'
        : 'Thợ đã cập nhật trạng thái công việc';
    const messageBody =
      receiverType === 'partner'
        ? 'Vui lòng kiểm tra!'
        : 'Thợ đã cập nhật trạng thái công việc. Vui lòng kiểm tra!';

    for (const token of tokens) {
      await this.notificationService.sendPushNotification(
        token,
        messageTitle,
        messageBody,
      );
    }

    this.eventEmitter.emit('appointment.UpdateStatus', {
      [`${receiverType}Id`]: targetUserId,
      appointment: updated,
    });

    return updated;
  }

  async updateToComplete(
    id: string,
    data: Partial<Appointment> & {
      partnerId?: Types.ObjectId;
      amount?: number;
    },
    transactionId?: string,
  ): Promise<Appointment> {
    const allowedFields = ['status', 'paymentMethod'];
    const filteredData: any = {};

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filteredData[key] = data[key];
      }
    }

    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, filteredData, { new: true })
      .populate({
        path: 'partnerId',
        model: 'User',
        select: 'phoneNumber fullName avatarUrl',
      })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    const userId =
      data.partnerId instanceof Types.ObjectId
        ? data.partnerId.toString()
        : data.partnerId;
    const amount = data.amount;

    if (!userId || !amount) {
      this.logger.warn(`⚠️ Thiếu userId hoặc amount khi cập nhật hoàn tất`);
      return updated;
    }

    if (updated.paymentMethod === 'qr') {
      await this.userService.addBalanceWithPercent(userId, amount, 0.9);
      await this.transactionModel.create({
        userId: new Types.ObjectId(userId),
        amount,
        status: 'success',
        type: 'appointment',
        transactionId: transactionId,
        paymentMethod: 'qr',
      });
    } else if (updated.paymentMethod === 'cash') {
      await this.userService.deductBalanceWithPercent(userId, amount, 0.1);
      await this.transactionModel.create({
        userId: new Types.ObjectId(userId),
        amount,
        status: 'success',
        type: 'appointment',
        transactionId: transactionId,
        paymentMethod: 'cash',
      });
    } else {
      this.logger.warn(
        `⚠️ paymentMethod không hợp lệ: ${updated.paymentMethod}`,
      );
    }

    this.eventEmitter.emit('appointment.updateComplete', {
      appointment: updated,
    });
    return updated;
  }

  async getById(id: string): Promise<Appointment> {
    const appointment = await this.appointmentModel
      .findById(id)
      .populate('orderId')
      .exec();

    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }
    return appointment;
  }

  async getAll(): Promise<Appointment[]> {
    return this.appointmentModel.find().populate('orderId').exec();
  }

  async getByPartnerId(partnerId: string): Promise<{
    appointmentInProgress: Appointment[];
    appointments: Appointment[];
  }> {
    const all = await this.appointmentModel
      .find({ partnerId: new Types.ObjectId(partnerId) })
      .populate('orderId')
      .populate({
        path: 'clientId',
        model: 'User',
        select: 'phoneNumber fullName avatarUrl',
      })
      .exec();

    const appointmentInProgress = all.filter(
      (app) =>
        app.status >= AppointmentStatus.NAVIGATION &&
        app.status <= AppointmentStatus.PAYMENT,
    );

    const appointments = all.filter(
      (app) =>
        app.status < AppointmentStatus.NAVIGATION ||
        app.status > AppointmentStatus.PAYMENT,
    );

    return { appointmentInProgress, appointments };
  }

  async getByClientId(clientId: string): Promise<{
    appointmentInProgress: Appointment[];
    appointments: Appointment[];
  }> {
    const all = await this.appointmentModel
      .find({ clientId: new Types.ObjectId(clientId) })
      .populate('orderId')
      .populate({
        path: 'partnerId',
        model: 'User',
        select: 'phoneNumber fullName avatarUrl',
      })
      .exec();

    const appointmentInProgress = all.filter(
      (app) =>
        app.status >= AppointmentStatus.NAVIGATION &&
        app.status <= AppointmentStatus.PAYMENT,
    );

    const appointments = all.filter(
      (app) =>
        app.status < AppointmentStatus.NAVIGATION ||
        app.status > AppointmentStatus.PAYMENT,
    );

    return { appointmentInProgress, appointments };
  }
}
