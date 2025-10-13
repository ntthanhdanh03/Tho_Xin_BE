import { Types } from 'mongoose';

export class CreateAppointmentDto {
  orderId: string | Types.ObjectId;
  clientId: string | Types.ObjectId;
  partnerId: string | Types.ObjectId;
  roomId: string | Types.ObjectId;
  agreedPrice?: string;
  laborCost?: string;
  note?: string;
}
