import { IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateChatRoomDto {
  @IsMongoId()
  @IsNotEmpty()
  orderId: string;

  @IsMongoId()
  @IsNotEmpty()
  clientId: string;

  @IsMongoId()
  @IsNotEmpty()
  partnerId: string;
}
