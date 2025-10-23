import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserService } from '../user/user.service';
import { Model, Types } from 'mongoose';

import { PaidTransaction } from 'src/schemas/paid-transaction.schema';
import { InjectModel } from '@nestjs/mongoose';
import { AppointmentService } from '../appointment/appointment.service';
import { Transaction } from 'src/schemas/transaction.schema';
import { Appointment } from 'src/schemas/appointment.schema';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  private readonly SEPAY_QR_URL = 'https://qr.sepay.vn/img';
  private readonly ACCOUNT = '0795528073';
  private readonly BANK = 'MB';

  constructor(
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(PaidTransaction.name)
    private readonly paidTransactionModel: Model<PaidTransaction>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<Appointment>,
    private readonly appointmentService: AppointmentService,
  ) {}

  async createQRTopUp(amount: number, userId: string) {
    const timestamp = Date.now();
    const description = `TOPUP${userId}_${timestamp}`;
    const qrUrl = `${this.SEPAY_QR_URL}?acc=${this.ACCOUNT}&bank=${this.BANK}&amount=${amount}&des=${description}`;

    await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      amount,
      status: 'pending',
      type: 'topUp',
      transactionId: description,
    });

    this.logger.log(`✅ Tạo giao dịch top-up: ${description}`);
    this.logger.log(`➡️ QR URL: ${qrUrl}`);

    return { qrUrl, description };
  }

  async createRequestWithdraw(amount: number, userId: string) {
    await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      amount,
      status: 'pending',
      type: 'withdraw',
    });

    this.logger.log(`✅ Tạo giao dịch withdraw: ${amount}`);
    return amount;
  }

  async createQRPaid(
    amount: number,
    clientId: string,
    partnerId: string,
    appointmentId: string,
  ) {
    const timestamp = Date.now();
    const description = `PAID${appointmentId}_${timestamp}`;
    const qrUrl = `${this.SEPAY_QR_URL}?acc=${this.ACCOUNT}&bank=${this.BANK}&amount=${amount}&des=${description}`;

    const paidTransaction = await this.paidTransactionModel.create({
      clientId: new Types.ObjectId(clientId),
      partnerId: new Types.ObjectId(partnerId),
      appointmentId: new Types.ObjectId(appointmentId),
      amount,
      status: 'pending',
      transactionCode: description,
    });

    this.logger.log(`✅ Tạo giao dịch Appointment QR: ${description}`);
    this.logger.log(`➡️ QR URL: ${qrUrl}`);

    return {
      qrUrl,
      description,
      transactionId: paidTransaction._id.toString(),
    };
  }

  async getTransactionsByUserId(userId: string) {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const transactions = await this.transactionModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .lean();

      return {
        transactions,
      };
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi lấy transaction của userId ${userId}`,
        error,
      );
      return { ok: false, message: 'internal_error' };
    }
  }

  async handleWebhook(payload: any) {
    this.logger.log('📩 Nhận webhook từ SePay:', payload);

    const raw = payload.description || payload.content || payload.code || '';
    const isTopUp = raw.includes('TOPUP');
    const isPaid = raw.includes('PAID');

    if (isTopUp) {
      return this.handleTopUpWebhook(raw, payload);
    } else if (isPaid) {
      return this.handlePaidWebhook(raw, payload);
    }

    this.logger.warn(`⚠️ Không nhận diện được loại giao dịch từ: ${raw}`);
    return { ok: false, reason: 'unknown_transaction_type' };
  }

  private async handleTopUpWebhook(raw: string, payload: any) {
    const matched = raw.match(/TOPUP([0-9a-fA-F]{24})(?:_(\d{13}))?/);

    if (!matched) {
      this.logger.warn(`⚠️ Không match được pattern TOPUP từ: ${raw}`);
      return { ok: false, reason: 'invalid_format' };
    }

    const userId = matched[1];
    const timestamp = matched[2];
    const amount = Number(payload.amount || payload.transferAmount || 0);

    this.logger.log(
      `🔍 Mô tả trích ra: TOPUP${userId}${timestamp ? '_' + timestamp : ''}`,
    );
    this.logger.log(`🔍 UserId: ${userId}`);

    const transaction = await this.transactionModel
      .findOne({
        transactionId: { $regex: `^TOPUP${userId}` },
        status: 'pending',
        type: 'topUp',
      })
      .sort({ createdAt: -1 });

    if (!transaction) {
      this.logger.warn(
        `❌ Không tìm thấy giao dịch phù hợp cho userId: ${userId}`,
      );
      return { ok: false, reason: 'not_found' };
    }

    if (amount !== transaction.amount) {
      this.logger.warn(`⚠️ Sai số tiền: ${amount} ≠ ${transaction.amount}`);
      return { ok: false, reason: 'amount_mismatch' };
    }

    const updatedProfile = await this.userService.addBalanceToPartner(
      userId,
      amount,
    );

    if (!updatedProfile) {
      this.logger.error(`❌ Không thể cập nhật số dư cho user ${userId}`);
      return { ok: false, reason: 'update_balance_failed' };
    }

    transaction.status = 'success';
    transaction.balanceAfter = updatedProfile.balance;
    await transaction.save();

    this.eventEmitter.emit('transaction.topUpSuccess', {
      userId,
      amount,
      newBalance: updatedProfile.balance,
      timestamp: Date.now(),
    });

    this.logger.log(
      `✅ Nạp tiền thành công cho user ${userId}, số dư mới: ${updatedProfile.balance}`,
    );
    return { ok: true, newBalance: updatedProfile.balance };
  }

  private async handlePaidWebhook(raw: string, payload: any) {
    const matched = raw.match(/PAID([0-9a-fA-F]{24})(?:_(\d{13}))?/);

    if (!matched) {
      this.logger.warn(`⚠️ Không match được pattern PAID từ: ${raw}`);
      return { ok: false, reason: 'invalid_format' };
    }

    const appointmentId = matched[1];
    const amount = Number(payload.amount || payload.transferAmount || 0);

    const transaction = await this.paidTransactionModel
      .findOne({
        transactionCode: { $regex: `^PAID${appointmentId}` },
        status: 'pending',
      })
      .sort({ createdAt: -1 });

    if (!transaction) {
      this.logger.warn(
        `❌ Không tìm thấy giao dịch phù hợp cho appointmentId: ${appointmentId}`,
      );
      return { ok: false, reason: 'not_found' };
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      this.logger.warn(`❌ Appointment ${appointmentId} không tồn tại`);
      return { ok: false, reason: 'appointment_not_found' };
    }

    const transactionAmount = transaction.amount;

    if (Math.abs(amount - transactionAmount) > 1) {
      this.logger.warn(`⚠️ Sai số tiền: ${amount} ≠ ${transactionAmount}`);
      return { ok: false, reason: 'amount_mismatch' };
    }

    transaction.status = 'success';
    await transaction.save();

    await this.appointmentService.updateToComplete(
      appointmentId,
      {
        status: 6,
        paymentMethod: 'qr',
        partnerId: transaction.partnerId,
        amount: appointment.agreedPrice,
      },
      transaction._id.toString(),
    );

    this.eventEmitter.emit('transaction.paid_appointment.success', {
      appointmentId,
      clientId: transaction.clientId,
      partnerId: transaction.partnerId,
      amount: appointment.agreedPrice,
      timestamp: Date.now(),
    });

    this.logger.log(
      `✅ Thanh toán thành công Appointment ${appointmentId}, số tiền: ${amount}`,
    );
    return { ok: true, appointmentId, amount };
  }

  async cleanupExpiredTransactions() {
    const TIMEOUT = 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - TIMEOUT);

    const topUpResult = await this.transactionModel.deleteMany({
      status: 'pending',
      createdAt: { $lt: cutoff },
      type: 'topUp',
    });

    const paidResult = await this.paidTransactionModel.deleteMany({
      status: 'pending',
      createdAt: { $lt: cutoff },
    });

    this.logger.log(
      `🗑️  Xóa giao dịch quá hạn - TopUp: ${topUpResult.deletedCount}, Paid: ${paidResult.deletedCount}`,
    );
  }
}
