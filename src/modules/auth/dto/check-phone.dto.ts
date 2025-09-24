import { IsEnum, IsString } from 'class-validator';
import { UserRole } from './role.enum';

export class CheckPhoneDto {
  @IsString()
  phoneNumber: string;

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ (client | partner)' })
  role: UserRole;
}
