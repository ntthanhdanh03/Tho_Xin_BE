import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { UserModule } from '../user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from 'src/schemas/transaction.schema';
import {
  PaidTransaction,
  PaidTransactionSchema,
} from 'src/schemas/paid-transaction.schema';
import { AppointmentModule } from '../appointment/appointment.module';
import { Appointment, AppointmentSchema } from 'src/schemas/appointment.schema';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: PaidTransaction.name, schema: PaidTransactionSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AppointmentModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
