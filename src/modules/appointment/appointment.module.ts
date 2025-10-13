import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppointmentService } from './appointment.service';
import { Appointment, AppointmentSchema } from 'src/schemas/appointment.schema';
import { AppointmentController } from './appointment.controller';
import {
  Installation,
  InstallationSchema,
} from 'src/schemas/create-installation.schema';
import { NotificationModule } from '../notication/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    MongooseModule.forFeature([
      { name: Installation.name, schema: InstallationSchema },
    ]),
    UserModule,
    NotificationModule,
  ],
  providers: [AppointmentService],
  controllers: [AppointmentController],
  exports: [AppointmentService],
})
export class AppointmentModule {}
