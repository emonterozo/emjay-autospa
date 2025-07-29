import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import {
  Conversation,
  ConversationSchema,
} from '../messages/schemas/conversation.schema';
import { Message, MessageSchema } from '../messages/schemas/message.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { Booking, BookingSchema } from './schema/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    FirebaseModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
