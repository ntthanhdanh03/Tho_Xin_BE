import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { PromotionService } from './promotion.service';

@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  // 📍 Lấy toàn bộ khuyến mãi (admin)
  @Get()
  async getAll() {
    return this.promotionService.findAll();
  }

  // 📍 Lấy khuyến mãi của client
  @Get('client/:clientId')
  async getClientPromotions(@Param('clientId') clientId: string) {
    return this.promotionService.getClientPromotions(clientId);
  }

  // 📍 Áp dụng mã khuyến mãi
  @Post('apply')
  async applyPromotion(
    @Body('appointmentId') appointmentId: string,
    @Body('promoCode') promoCode: string,
    @Body('userId') userId: string,
  ) {
    return this.promotionService.applyPromotion(appointmentId, promoCode, userId);
  }

  // 📍 Tạo khuyến mãi (admin)
  @Post()
  async create(@Body() data: any) {
    return this.promotionService.createPromotion(data);
  }

  // 📍 Xóa khuyến mãi
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.promotionService.remove(id);
  }
}
