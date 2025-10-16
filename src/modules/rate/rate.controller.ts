import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { RateService } from './rate.service';

@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Post()
  async createRate(@Body() dto: any) {
    return this.rateService.createRateAppointment(dto, dto.clientId);
  }

  @Get('partner/:partnerId')
  async getPartnerRates(@Param('partnerId') partnerId: string) {
    return this.rateService.getRatesByPartner(partnerId);
  }
}
