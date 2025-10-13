import {
  Controller,
  Get,
  Query,
  Patch,
  Param,
  Body,
  Post,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdatePartnerKycDto } from './dto/update-partner-kyc.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Express } from 'express';

const allowedFields = [
  'idCardFrontImageUrl',
  'idCardBackImageUrl',
  'criminalRecordImageUrl',
  'registeredSimImageUrl',
  'avatarImageUrl',
  'imageService',
];

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('partners')
  async findPartners(@Query('keyword') keyword: string) {
    return this.userService.findPartners(keyword);
  }

  @Get('location/:userId')
  async getLocation(@Param('userId') userId: string) {
    return this.userService.getByUserId(userId);
  }

  @Patch('location')
  async updateLocation(
    @Body()
    body: {
      userId: string;
      latitude: number;
      longitude: number;
      clientId?: string;
    },
  ) {
    return this.userService.updateLocation(
      body.userId,
      body.latitude,
      body.longitude,
      body.clientId,
    );
  }

  @Patch('partner-kyc/:kycId')
  async updatePartnerKYCById(
    @Param('kycId') kycId: string,
    @Body() dto: UpdatePartnerKycDto,
  ) {
    return this.userService.updatePartnerKYCById(kycId, dto);
  }

  @Patch(':id/client')
  async updateClient(
    @Param('id') userId: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.userService.updateClient(userId, dto);
  }

  @Patch(':partnerProfileId/online')
  async updateOnline(
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: { isOnline: boolean },
  ) {
    return this.userService.updatePartnerProfile(partnerProfileId, {
      isOnline: dto.isOnline,
    });
  }

  @Post('upload-kyc/:field')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const field = req.params.field;
          if (!allowedFields.includes(field)) {
            return cb(
              new BadRequestException('Trường field không hợp lệ'),
              undefined,
            );
          }

          const folder = join(process.cwd(), 'uploads', 'kyc', field);
          fs.mkdirSync(folder, { recursive: true });
          cb(null, folder);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  async uploadKycImage(
    @Param('field') field: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Chưa chọn file');

    const imageUrl = `http://192.168.1.9:3000/uploads/kyc/${field}/${file.filename}`;
    return {
      message: 'Upload thành công',
      url: imageUrl,
    };
  }

  @Patch(':id')
  async updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(userId, dto);
  }
}
