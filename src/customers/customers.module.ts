import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { PromosModule } from '../promos/promos.module';
import { FirebaseModule } from '../firebase/firebase.module';
import {
  Conversation,
  ConversationSchema,
} from '../messages/schemas/conversation.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    TransactionsModule,
    PromosModule,
    FirebaseModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
