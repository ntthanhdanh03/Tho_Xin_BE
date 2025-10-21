import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Promotion, PromotionSchema } from 'src/schemas/promotion.schema';
import { Appointment, AppointmentSchema } from 'src/schemas/appointment.schema';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
