import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
  Put,
  Param,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-auth.dto';
import { LoginDto } from './dto/login-auth.dto';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CheckPhoneDto } from './dto/check-phone.dto';
import { create } from 'domain';
import { CreateInstallationDto } from './dto/create_installation.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.register(dto);
  }
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refreshToken')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('checkPhoneExist')
  async checkPhone(@Body() dto: CheckPhoneDto) {
    return this.authService.checkPhoneExist(dto.phoneNumber, dto.role);
  }

  @Put('installations')
  async createOrUpdateInstallation(@Body() createDto: CreateInstallationDto) {
    return this.authService.createInstallation(createDto);
  }

  @Delete('installations/:userId/:token')
  async removeDeviceToken(
    @Param('userId') userId: string,
    @Param('token') token: string,
  ) {
    return this.authService.removeDeviceToken(userId, token);
  }
}
