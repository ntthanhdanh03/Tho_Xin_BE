export class UpdateUserDto {
  fullName?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: Date;
}
