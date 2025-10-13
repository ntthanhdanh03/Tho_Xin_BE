import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  PartnerProfile,
  PartnerProfileDocument,
} from 'src/schemas/partner-profile.schema';
import { PartnerKYC, PartnerKYCDocument } from 'src/schemas/partner-kyc.schema';
import { Client, ClientDocument } from 'src/schemas/client.schema';
import { Model, Types } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';
// import { UpdatePartnerProfileDto } from './dto/update-partner-online.dto';
import { UpdatePartnerKycDto } from './dto/update-partner-kyc.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdatePartnerOnlineDto } from './dto/update-partner-online.dto';
import {
  PartnerLocation,
  PartnerLocationDocument,
} from 'src/schemas/partner-location.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PartnerProfile.name)
    private partnerProfileModel: Model<PartnerProfileDocument>,
    @InjectModel(PartnerKYC.name)
    private partnerKYCModel: Model<PartnerKYCDocument>,
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
    @InjectModel(PartnerLocation.name)
    private partnerLocationModel: Model<PartnerLocationDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findPartners(keyword?: string) {
    try {
      const query: any = { role: 'partner' };
      if (keyword) {
        query.fullName = { $regex: keyword, $options: 'i' };
      }
      return await this.userModel.find(query, {
        phoneNumber: 1,
        fullName: 1,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) throw new NotFoundException('User không tồn tại');

      if (dto.fullName) user.fullName = dto.fullName;
      if (dto.avatarUrl) user.avatarUrl = dto.avatarUrl;
      if (dto.gender) user.gender = dto.gender;
      if (dto.dateOfBirth) user.dateOfBirth = dto.dateOfBirth;
      await user.save();

      return { message: 'Cập nhật user thành công' };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async updatePartnerKYCById(kycId: string, dto: UpdatePartnerKycDto) {
    try {
      const result = await this.partnerKYCModel.updateOne(
        { _id: new Types.ObjectId(kycId) },
        { $set: dto },
      );

      if (result.modifiedCount === 0) {
        throw new NotFoundException('Không tìm thấy PartnerKYC theo _id');
      }

      return { message: 'Cập nhật PartnerKYC thành công' };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateClient(userId: string, dto: UpdateClientDto) {
    try {
      await this.clientModel.updateOne({ userId }, { $set: dto });
      return { message: 'Cập nhật Client thành công' };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async updatePartnerProfile(
    partnerUserId: string,
    dto: UpdatePartnerOnlineDto,
  ) {
    try {
      const userObjectId = new Types.ObjectId(partnerUserId);

      const profile = await this.partnerProfileModel.findOne({
        userId: userObjectId,
      });
      if (!profile) {
        throw new NotFoundException(
          `Không tìm thấy partnerProfileModel với userId ${partnerUserId}`,
        );
      }

      await this.partnerProfileModel.updateOne(
        { _id: profile._id },
        { $set: dto },
      );

      return { updateOnline: true, dto };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getByUserId(userId: string) {
    const location = await this.partnerLocationModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!location) throw new NotFoundException('Partner location not found');
    return location;
  }

  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    clientId?: string,
  ) {
    const updated = await this.partnerLocationModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        latitude,
        longitude,
        isActive: true,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true },
    );

    if (clientId) {
      this.eventEmitter.emit('location.update', {
        clientId,
        partnerId: userId,
        latitude,
        longitude,
      });
    }

    return {
      success: true,
      message: 'Cập nhật vị trí thành công',
      data: updated,
    };
  }

  async addBalanceToPartner(userId: string, amount: number) {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const updatedProfile = await this.partnerProfileModel.findOneAndUpdate(
        { userId: userObjectId },
        { $inc: { balance: amount } },
        { new: true },
      );

      if (!updatedProfile) {
        this.logger.error(
          `❌ Không tìm thấy PartnerProfile với userId ${userId}`,
        );
        return null;
      }

      this.logger.log(
        `💰 Đã cộng ${amount}đ cho user ${userId}. Số dư mới: ${updatedProfile.balance}`,
      );

      return updatedProfile;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi cập nhật số dư: ${error.message}`);
      return null;
    }
  }

  async deductBalanceFromPartner(userId: string, amount: number) {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const profile = await this.partnerProfileModel.findOne({
        userId: userObjectId,
      });
      if (!profile) {
        this.logger.error(
          `❌ Không tìm thấy PartnerProfile với userId ${userId}`,
        );
        return null;
      }

      if (profile.balance < amount) {
        this.logger.warn(
          `⚠️ User ${userId} không đủ số dư. Hiện có ${profile.balance}, cần ${amount}`,
        );
        return null;
      }

      const updatedProfile = await this.partnerProfileModel.findOneAndUpdate(
        { userId: userObjectId },
        { $inc: { balance: -amount } },
        { new: true },
      );

      this.logger.log(
        `💸 Đã trừ ${amount}đ khỏi user ${userId}. Số dư mới: ${updatedProfile.balance}`,
      );

      return updatedProfile;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi trừ tiền: ${error.message}`);
      return null;
    }
  }

  async addBalanceWithPercent(userId: string, amount: number, percent: number) {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const actualAmount = Math.floor(amount * percent);

      const updatedProfile = await this.partnerProfileModel.findOneAndUpdate(
        { userId: userObjectId },
        { $inc: { balance: actualAmount } },
        { new: true },
      );

      if (!updatedProfile) {
        this.logger.error(
          `❌ Không tìm thấy PartnerProfile với userId ${userId}`,
        );
        return null;
      }

      this.logger.log(
        `💰 Đã cộng ${actualAmount}đ (${percent * 100}% của ${amount}đ) cho user ${userId}. Số dư mới: ${updatedProfile.balance}`,
      );

      return updatedProfile;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi cộng tiền có %: ${error.message}`);
      return null;
    }
  }

  async deductBalanceWithPercent(
    userId: string,
    amount: number,
    percent: number,
  ) {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const actualAmount = Math.floor(amount * percent);

      const profile = await this.partnerProfileModel.findOne({
        userId: userObjectId,
      });

      if (!profile) {
        this.logger.error(
          `❌ Không tìm thấy PartnerProfile với userId ${userId}`,
        );
        return null;
      }

      if (profile.balance < actualAmount) {
        this.logger.warn(
          `⚠️ User ${userId} không đủ số dư. Hiện có ${profile.balance}, cần ${actualAmount}`,
        );
        return null;
      }

      const updatedProfile = await this.partnerProfileModel.findOneAndUpdate(
        { userId: userObjectId },
        { $inc: { balance: -actualAmount } },
        { new: true },
      );

      this.logger.log(
        `💸 Đã trừ ${actualAmount}đ (${percent * 100}% của ${amount}đ) khỏi user ${userId}. Số dư mới: ${updatedProfile.balance}`,
      );

      return updatedProfile;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi trừ tiền có %: ${error.message}`);
      return null;
    }
  }
}
