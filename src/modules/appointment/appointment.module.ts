import { Promotion } from 'src/schemas/promotion.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppointmentService } from './appointment.service';
import { Appointment, AppointmentSchema } from 'src/schemas/appointment.schema';
import { AppointmentController } from './appointment.controller';
import {
  Installation,
  InstallationSchema,
} from 'src/schemas/create-installation.schema';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { Transaction, TransactionSchema } from 'src/schemas/transaction.schema';
import { Rate, RateSchema } from 'src/schemas/rate.schema';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Installation.name, schema: InstallationSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Rate.name, schema: RateSchema },
    ]),
    UserModule,
    NotificationModule,
    PromotionModule,
  ],
  providers: [AppointmentService],
  controllers: [AppointmentController],
  exports: [AppointmentService],
})
export class AppointmentModule {}
