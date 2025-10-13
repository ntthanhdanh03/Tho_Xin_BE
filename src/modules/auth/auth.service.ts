import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { PartnerKYC, PartnerKYCDocument } from 'src/schemas/partner-kyc.schema';
import {
  PartnerProfile,
  PartnerProfileDocument,
} from 'src/schemas/partner-profile.schema';
import { Model, Types } from 'mongoose';
import { RegisterUserDto } from './dto/register-auth.dto';
import * as bcrypt from 'bcrypt';
import { Client, ClientDocument } from 'src/schemas/client.schema';
import { LoginDto } from './dto/login-auth.dto';
import { jwtConfig } from 'src/config/jwt.config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole } from './dto/role.enum';
import { CreateInstallationDto } from './dto/create_installation.dto';
import {
  Installation,
  InstallationDocument,
} from 'src/schemas/create-installation.schema';
import {
  PartnerLocation,
  PartnerLocationDocument,
} from 'src/schemas/partner-location.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PartnerProfile.name)
    private partnerProfileModel: Model<PartnerProfileDocument>,
    @InjectModel(PartnerKYC.name)
    private partnerKYCModel: Model<PartnerKYCDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(PartnerLocation.name)
    private partnerLocationModel: Model<PartnerLocationDocument>,
    @InjectModel(Installation.name)
    private readonly installationModel: Model<InstallationDocument>,
    private jwtService: JwtService,
  ) {}

  private generateToken(userId: string, phoneNumber: string, role: string) {
    const payload = {
      sub: userId,
      phoneNumber,
      role,
      iat: Math.floor(Date.now() / 1000),
    };
    return this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.refreshTokenExpiresIn,
    });
  }

  async register(dto: RegisterUserDto) {
    try {
      const existing = await this.userModel.findOne({
        phoneNumber: dto.phoneNumber,
        role: dto.role,
      });
      if (existing) {
        throw new BadRequestException(
          `Số điện thoại ${dto.phoneNumber} đã tồn tại cho role ${dto.role}`,
        );
      }

      const hashedPassword = await bcrypt.hash(dto.password, 6);

      const user = await this.userModel.create({
        phoneNumber: dto.phoneNumber,
        password: hashedPassword,
        role: dto.role,
      });

      if (dto.role === 'partner') {
        await this.partnerProfileModel.create({ userId: user._id });
        await this.partnerKYCModel.create({ userId: user._id });
        await this.partnerLocationModel.create({
          userId: user._id,
          latitude: 0,
          longitude: 0,
          isActive: false,
        });
      } else if (dto.role === 'client') {
        await this.clientModel.create({ userId: user._id });
      }

      await this.installationModel.create({
        idUsers: user._id,
        deviceToken: [],
      });

      console.log('Đăng kí thành công ', dto.phoneNumber, dto.role);

      return {
        success: true,
        message: 'Đăng ký thành công',
        data: {
          userId: user._id,
          role: user.role,
        },
      };
    } catch (e) {
      return {
        success: false,
        message: e.response?.message || e.message,
      };
    }
  }

  async checkPhoneExist(phoneNumber: string, role: UserRole) {
    try {
      const user = await this.userModel.findOne({ phoneNumber, role }).lean();
      return { exists: !!user };
    } catch (error) {
      Logger.error(
        `Lỗi khi kiểm tra số điện thoại ${phoneNumber} và role ${role}: ${error.message}`,
        error.stack,
        'UserService.checkPhoneExist',
      );
      throw new InternalServerErrorException('Lỗi khi kiểm tra số điện thoại');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.userModel.findOne({
        phoneNumber: dto.phoneNumber,
        role: dto.role,
      });

      if (!user) {
        throw new BadRequestException('Tài khoản không tồn tại với role này');
      }

      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (!isMatch) {
        throw new BadRequestException('Mật khẩu không đúng');
      }

      const token = this.generateToken(
        user._id.toString(),
        user.phoneNumber,
        user.role,
      );

      const { password, __v, ...userBase } = user.toObject();
      const userResponse: any = userBase;
      if (user.role === 'client') {
        const client = await this.clientModel
          .findOne({ userId: user._id })
          .lean();
        if (client) {
          const { userId, createdAt, updatedAt, __v, ...clientData }: any =
            client;
          const filteredClientData = this.filterEmptyFields(clientData);
          if (Object.keys(filteredClientData).length > 0) {
            userResponse.client = filteredClientData;
          }
        }
      } else if (user.role === 'partner') {
        const profile = await this.partnerProfileModel
          .findOne({ userId: user._id })
          .lean();
        const kyc = await this.partnerKYCModel
          .findOne({ userId: user._id })
          .lean();

        const partnerData: any = {};

        if (profile) {
          const { userId, createdAt, updatedAt, __v, ...profileData }: any =
            profile;
          const filteredProfileData = this.filterEmptyFields(profileData);
          if (Object.keys(filteredProfileData).length > 0) {
            partnerData.profile = filteredProfileData;
          }
        }

        if (kyc) {
          const { userId, createdAt, updatedAt, __v, ...kycData }: any = kyc;
          const filteredKycData = this.filterEmptyFields(kycData);
          if (Object.keys(filteredKycData).length > 0) {
            partnerData.kyc = filteredKycData;
          }
        }

        if (Object.keys(partnerData).length > 0) {
          userResponse.partner = partnerData;
        }
      }

      return {
        user: userResponse,
        token,
      };
    } catch (error) {
      Logger.error(
        `Đăng nhập thất bại cho số điện thoại ${dto.phoneNumber}, role ${dto.role}: ${error.message}`,
        error.stack,
        'AuthService.login',
      );

      if (error instanceof BadRequestException) throw error;

      throw new InternalServerErrorException(
        'Đã có lỗi xảy ra. Vui lòng thử lại sau!',
      );
    }
  }

  private filterEmptyFields(data: any): any {
    if (!data || typeof data !== 'object') return {};

    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'boolean' || typeof value === 'number' || value) {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken: oldToken } = dto;

    try {
      const payload = this.jwtService.verify(oldToken, {
        secret: jwtConfig.secret,
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      const newToken = this.generateToken(
        user._id.toString(),
        user.phoneNumber,
        user.role,
      );

      const userProfile = await this.getUserProfile(user._id.toString());

      return {
        user: userProfile,
        token: newToken,
      };
    } catch (error) {
      Logger.error(
        `Refresh token thất bại: ${error.message}`,
        error.stack,
        'UserService.refreshToken',
      );

      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async getUserProfile(userId: string) {
    try {
      const user = await this.userModel.findById(userId).lean();

      if (!user) {
        throw new BadRequestException('Người dùng không tồn tại');
      }

      const { password, __v, ...userData } = user;
      const userResponse: any = userData;

      if (user.role === 'client') {
        const client = await this.clientModel
          .findOne({ userId: user._id })
          .lean();

        if (client) {
          const { userId, createdAt, updatedAt, __v, ...clientData }: any =
            client;
          const filteredClientData = this.filterEmptyFields(clientData);

          if (Object.keys(filteredClientData).length > 0) {
            userResponse.client = filteredClientData;
          }
        }
      } else if (user.role === 'partner') {
        const profile = await this.partnerProfileModel
          .findOne({ userId: user._id })
          .lean();

        const kyc = await this.partnerKYCModel
          .findOne({ userId: user._id })
          .lean();

        const partnerData: any = {};

        if (profile) {
          const { userId, createdAt, updatedAt, __v, ...profileData }: any =
            profile;
          const filteredProfileData = this.filterEmptyFields(profileData);

          if (Object.keys(filteredProfileData).length > 0) {
            partnerData.profile = filteredProfileData;
          }
        }

        if (kyc) {
          const { userId, createdAt, updatedAt, __v, ...kycData }: any = kyc;
          const filteredKycData = this.filterEmptyFields(kycData);

          if (Object.keys(filteredKycData).length > 0) {
            partnerData.kyc = filteredKycData;
          }
        }

        if (Object.keys(partnerData).length > 0) {
          userResponse.partner = partnerData;
        }
      }

      return userResponse;
    } catch (error) {
      Logger.error(
        `Lấy thông tin user thất bại cho ID ${userId}: ${error.message}`,
        error.stack,
        'UserService.getUserProfile',
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Đã có lỗi xảy ra. Vui lòng thử lại sau!',
      );
    }
  }

  async createInstallation(createDto: CreateInstallationDto) {
    const { userId, deviceToken } = createDto;

    const installation = await this.installationModel.findOne({
      idUsers: new Types.ObjectId(userId),
    });

    if (!installation) {
      return this.installationModel.create({
        idUsers: new Types.ObjectId(userId),
        deviceToken: [deviceToken], // <-- nhận object {token, osVersion, fcmToken}
      });
    }

    const tokenExists = installation.deviceToken.some(
      (item) => item.token === deviceToken.token,
    );

    if (!tokenExists) {
      installation.deviceToken.push(deviceToken);
      await installation.save();
      return { message: 'Token được thêm thành công' };
    } else {
      return { message: 'Token đã tồn tại' };
    }
  }

  async removeDeviceToken(userId: string, token: string) {
    const installation = await this.installationModel.findOne({
      idUsers: new Types.ObjectId(userId),
    });

    if (!installation) {
      return { message: 'Không tìm thấy installation' };
    }

    const beforeCount = installation.deviceToken.length;

    installation.deviceToken = installation.deviceToken.filter(
      (item) => item.token !== token,
    );

    if (installation.deviceToken.length === beforeCount) {
      return { message: 'Không tìm thấy token để xoá' };
    }

    await installation.save();
    return { message: 'Đăng xuất thành công' };
  }
}
