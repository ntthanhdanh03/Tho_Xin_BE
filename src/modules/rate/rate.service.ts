import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rate, RateDocument } from 'src/schemas/rate.schema';
import {
  Appointment,
  AppointmentDocument,
} from 'src/schemas/appointment.schema';

@Injectable()
export class RateService {
  constructor(
    @InjectModel(Rate.name) private rateModel: Model<RateDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async createRateAppointment(dto: any, clientId: string) {
    const { appointmentId, partnerId, rating, comment, images } = dto;

    if (!appointmentId || !partnerId || !rating) {
      throw new BadRequestException('Thiếu dữ liệu cần thiết');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy cuộc hẹn');
    }

    if (appointment.clientId.toString() !== clientId.toString()) {
      throw new BadRequestException(
        'Bạn không thể đánh giá cuộc hẹn của người khác',
      );
    }

    const existedRate = await this.rateModel.findOne({ appointmentId });
    if (existedRate) {
      throw new BadRequestException('Cuộc hẹn này đã được đánh giá rồi');
    }

    const newRate = await this.rateModel.create({
      clientId: new Types.ObjectId(clientId),
      partnerId: new Types.ObjectId(partnerId),
      appointmentId: new Types.ObjectId(appointmentId),
      rating,
      comment,
      images: images || [],
    });

    return this.rateModel
      .findById(newRate._id)
      .populate('clientId', 'fullName avatarUrl')
      .populate('partnerId', 'fullName avatarUrl');
  }

  async getRatesByPartner(partnerId: string) {
    if (!partnerId) {
      throw new BadRequestException('Thiếu partnerId');
    }

    const rates = await this.rateModel
      .find({ partnerId: new Types.ObjectId(partnerId) })
      .populate('clientId', 'fullName avatarUrl')
      .populate('appointmentId', 'createdAt status')
      .sort({ createdAt: -1 });

    return {
      averageRating:
        rates.length > 0
          ? (
              rates.reduce((acc, r) => acc + (r.rating || 0), 0) / rates.length
            ).toFixed(1)
          : null,
      total: rates.length,
      rates,
    };
  }
}
