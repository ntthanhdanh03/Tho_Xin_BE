import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrderService } from './oderservice';
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

  @Get(':id')
  getOne(@Param('id') id: string): Promise<Order> {
    return this.orderService.getOrderById(id);
  }
  @Get('client/:clientId')
  async getOrdersByClient(
    @Param('clientId') clientId: string,
  ): Promise<OrderDocument[]> {
    return this.orderService.getOrdersByClient(clientId);
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

  @Patch(':id/cancel')
  cancel(@Param('id') id: string): Promise<Order> {
    return this.orderService.cancelOrder(id);
  }
}
