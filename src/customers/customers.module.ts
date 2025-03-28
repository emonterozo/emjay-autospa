import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { PromosModule } from '../promos/promos.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    TransactionsModule,
    PromosModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
