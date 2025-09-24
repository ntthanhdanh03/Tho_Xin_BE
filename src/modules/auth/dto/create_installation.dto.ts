// dto/create-installation.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class DeviceTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  os: string;
}

export class CreateInstallationDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  deviceToken: DeviceTokenDto;

  @IsNotEmpty()
  @IsString()
  osVersion: string;

  @IsNotEmpty()
  @IsString()
  fcmToken: string;
}
