import { IsNotEmpty, IsMongoId, IsIn, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  roomId: string;

  @IsMongoId()
  @IsNotEmpty()
  senderId: string;

  @IsMongoId()
  @IsNotEmpty()
  orderId: string;

  @IsIn(['client', 'partner'])
  @IsNotEmpty()
  senderType: 'client' | 'partner';

  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @IsIn(['text', 'image'])
  @IsNotEmpty()
  type: 'text' | 'image';

  @IsOptional()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsNotEmpty()
  imageUrl?: string;
}
