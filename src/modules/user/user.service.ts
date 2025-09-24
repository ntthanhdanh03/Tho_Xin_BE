import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
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

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PartnerProfile.name)
    private partnerProfileModel: Model<PartnerProfileDocument>,
    @InjectModel(PartnerKYC.name)
    private partnerKYCModel: Model<PartnerKYCDocument>,
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
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
      console.log(
        'partnerUserId:',
        partnerUserId,
        'length:',
        partnerUserId.length,
      );
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
}
