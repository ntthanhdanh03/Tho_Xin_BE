import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from './role.enum';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
