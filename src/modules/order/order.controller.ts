import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderDocument } from 'src/schemas/order.schema';
import { AddApplicantDto } from './dto/add-applicant.dto';
import { SelectApplicantDto } from './dto/select-applicant.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto): Promise<Order> {
    return this.orderService.createOrder(dto);
  }

  @Get()
  getAll(): Promise<Order[]> {
    return this.orderService.getOrders();
  }

  @Get('client/:clientId')
  getByClient(@Param('clientId') clientId: string): Promise<Order[]> {
    return this.orderService.getOrdersByClient(clientId);
  }

  @Get('types')
  getByTypes(
    @Query('types') types: string | string[],
  ): Promise<OrderDocument[]> {
    // controller chỉ parse query => service xử lý
    const typesArray = Array.isArray(types)
      ? types.map((t) => t.trim()).filter(Boolean)
      : (types || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

    return this.orderService.getOrdersByTypes(typesArray);
  }

  @Get(':id')
  getOne(@Param('id') id: string): Promise<Order> {
    return this.orderService.getOrderById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Order>,
  ): Promise<Order> {
    return this.orderService.updateOrder(id, data);
  }

  @Patch(':id/applicants')
  addApplicant(
    @Param('id') id: string,
    @Body() dto: AddApplicantDto,
  ): Promise<Order> {
    return this.orderService.addApplicant(id, dto);
  }

  @Patch(':id/select')
  selectApplicant(
    @Param('id') id: string,
    @Body() dto: SelectApplicantDto,
  ): Promise<Order> {
    return this.orderService.selectApplicant(id, dto.partnerId);
  }

  @Patch(':id/cancel-applicant/:partnerId')
  cancelApplicant(
    @Param('id') orderId: string,
    @Param('partnerId') partnerId: string,
  ): Promise<Order> {
    return this.orderService.cancelApplicant(orderId, partnerId);
  }
}
