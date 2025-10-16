import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { Request } from 'express';
import { TransactionService } from './transaction.service';

@Controller('payment')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('topup')
  async createTopUp(@Body() body: { amount: number; userId: string }) {
    const { amount, userId } = body;
    return this.transactionService.createQRTopUp(amount, userId);
  }

  @Post('with-draw')
  async createWithDraw(@Body() body: { amount: number; userId: string }) {
    const { amount, userId } = body;
    return this.transactionService.createRequestWithdraw(amount, userId);
  }

  @Get('user/:userId')
  async getTransactionsByUserId(@Param('userId') userId: string) {
    return await this.transactionService.getTransactionsByUserId(userId);
  }

  // @Post('with-draw/id/accept')
  // async acceptWithDraw(@Body() body: { amount: number; userId: string }) {
  //   const { amount, userId } = body;
  //   return this.transactionService.createRequestWithdraw(amount, userId);
  // }

  @Post('paid')
  async createPaid(
    @Body()
    body: {
      amount: number;
      clientId: string;
      partnerId: string;
      appointmentId: string;
    },
  ) {
    const { amount, clientId, partnerId, appointmentId } = body;
    return this.transactionService.createQRPaid(
      amount,
      clientId,
      partnerId,
      appointmentId,
    );
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request) {
    const payload = req.body;
    return this.transactionService.handleWebhook(payload);
  }
}
