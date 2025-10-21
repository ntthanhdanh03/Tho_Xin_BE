import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Promotion,
  PromotionDocument,
  PromotionType,
  PromotionCategory,
} from 'src/schemas/promotion.schema';
import { Appointment } from 'src/schemas/appointment.schema';

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name)
    private readonly promotionModel: Model<PromotionDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<Appointment>,
  ) {}

  async findAll() {
    return this.promotionModel.find().sort({ createdAt: -1 });
  }

  async getClientPromotions(clientId: string) {
    const now = new Date();
    const clientObjectId = new Types.ObjectId(clientId);

    const promos = await this.promotionModel.find({
      isActive: true,
      $and: [
        {
          $or: [
            { category: PromotionCategory.GLOBAL },
            {
              category: PromotionCategory.WELCOME,
              targetClients: clientObjectId,
            },
            {
              category: PromotionCategory.PERSONAL,
              targetClients: clientObjectId,
            },
            {
              category: PromotionCategory.EVENT,
              startDate: { $lte: now },
              $or: [{ endDate: null }, { endDate: { $gte: now } }],
            },
          ],
        },
      ],
    });

    const availablePromos = promos.filter((promo) => {
      const usedCount =
        promo.usageHistory?.filter((u) => u.userId.equals(clientObjectId))
          .length || 0;
      return usedCount < (promo.usagePerUser || 1);
    });

    return availablePromos;
  }

  async applyPromotion(
    appointmentId: string,
    promoCode: string,
    userId: string,
  ) {
    const promo = await this.promotionModel.findOne({
      code: promoCode,
      isActive: true,
    });

    if (!promo)
      throw new NotFoundException(
        'Mã khuyến mãi không tồn tại hoặc đã hết hạn',
      );

    const now = new Date();
    if (promo.startDate && promo.startDate > now)
      throw new BadRequestException('Chưa đến thời gian áp dụng');
    if (promo.endDate && promo.endDate < now)
      throw new BadRequestException('Mã khuyến mãi đã hết hạn');

    const usedCount =
      promo.usageHistory?.filter((u) => u.userId.equals(userId)).length || 0;

    if (usedCount >= promo.usagePerUser)
      throw new BadRequestException('Bạn đã sử dụng mã này rồi');

    if (promo.usageLimit && promo.usageCount >= promo.usageLimit)
      throw new BadRequestException('Mã khuyến mãi đã đạt giới hạn sử dụng');

    if (
      promo.targetClients?.length &&
      !promo.targetClients.some((u) => u.equals(userId))
    ) {
      throw new BadRequestException('Mã khuyến mãi này không dành cho bạn');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) throw new NotFoundException('Không tìm thấy lịch hẹn');

    let discount = 0;
    if (promo.type === PromotionType.PERCENTAGE) {
      discount = (appointment.agreedPrice * promo.value) / 100;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else {
      discount = promo.value;
    }

    appointment.promotionCode = promo.code;
    appointment.promotionDiscount = discount;

    const basePrice =
      (appointment.agreedPrice || 0) + (appointment.laborCost || 0);
    appointment.finalAmount = Math.max(basePrice - discount, 0);

    await appointment.save();

    promo.usageCount += 1;
    promo.usageHistory.push({
      userId: new Types.ObjectId(userId),
      usedAt: now,
    });
    await promo.save();

    return { success: true, discount, finalAmount: appointment.finalAmount };
  }

  async createPromotion(data: any) {
    const exist = await this.promotionModel.findOne({ code: data.code });
    if (exist) throw new BadRequestException('Mã khuyến mãi đã tồn tại');
    return this.promotionModel.create(data);
  }

  // 📍 Xóa khuyến mãi
  async remove(id: string) {
    const promo = await this.promotionModel.findById(id);
    if (!promo) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
    await promo.deleteOne();
    return { success: true };
  }

  async addClientToWelcomePromo(clientId: string) {
    let promo = await this.promotionModel.findOne({ code: 'WELCOME50K' });

    if (!promo) {
      return { success: false };
    }

    if (!promo.targetClients.some((id) => id.equals(clientId))) {
      promo.targetClients.push(new Types.ObjectId(clientId));
      await promo.save();
    }

    return promo;
  }
}
