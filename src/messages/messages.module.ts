import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    FirebaseModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
