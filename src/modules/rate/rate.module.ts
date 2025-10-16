import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rate, RateSchema } from 'src/schemas/rate.schema';
import { Appointment, AppointmentSchema } from 'src/schemas/appointment.schema';
import { RateService } from './rate.service';
import { RateController } from './rate.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rate.name, schema: RateSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [RateController],
  providers: [RateService],
  exports: [RateService],
})
export class RateModule {}
