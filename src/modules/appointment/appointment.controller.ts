import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { Appointment } from 'src/schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Types } from 'mongoose';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  async updateToComplete(
    @Param('id') id: string,
    @Body()
    body: {
      partnerId: Types.ObjectId;
      amount: number;
      paymentMethod: 'qr' | 'cash';
    },
  ) {
    const updated = await this.appointmentService.updateToComplete(id, {
      status: 6,
      paymentMethod: body.paymentMethod,
      partnerId: body.partnerId,
      amount: body.amount,
    });

    return {
      message: '✅ Appointment updated to complete successfully',
      data: updated,
    };
  }

  @Post()
  async create(@Body() data: CreateAppointmentDto) {
    return this.appointmentService.create(data);
  }

  @Patch(':id/:type')
  update(
    @Param('id') id: string,
    @Param('type') type: 'client' | 'partner',
    @Body() data: Partial<Appointment>,
  ) {
    return this.appointmentService.update(id, data, type);
  }

  @Get('partner/:partnerId')
  async getByPartnerId(@Param('partnerId') partnerId: string) {
    return this.appointmentService.getByPartnerId(partnerId);
  }

  @Get('client/:clientId')
  async getByClientId(@Param('clientId') clientId: string) {
    return this.appointmentService.getByClientId(clientId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.appointmentService.getById(id);
  }
  @Post(':id/cancel')
  async cancelAppointment(@Param('id') id: string, @Body() dto: any) {
    return this.appointmentService.updateToCancel(id, dto.reason);
  }

  @Get('order/:orderId')
  getByOrderId(@Param('orderId') orderId: string) {
    return this.appointmentService.getByOrderId(orderId);
  }
}
