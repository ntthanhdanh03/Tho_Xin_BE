import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import {
  Installation,
  InstallationSchema,
} from 'src/schemas/create-installation.schema';
import { PartnerKYC, PartnerKYCSchema } from 'src/schemas/partner-kyc.schema';
import { NotificationModule } from '../notication/notification.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import {
  PartnerProfile,
  PartnerProfileSchema,
} from 'src/schemas/partner-profile.schema';
import { ChatModule } from '../chat/chat.module';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    MongooseModule.forFeature([
      { name: Installation.name, schema: InstallationSchema },
    ]),
    MongooseModule.forFeature([
      { name: PartnerKYC.name, schema: PartnerKYCSchema },
    ]),
    MongooseModule.forFeature([
      { name: PartnerProfile.name, schema: PartnerProfileSchema },
    ]),
    AppointmentModule,
    NotificationModule,
    ChatModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
