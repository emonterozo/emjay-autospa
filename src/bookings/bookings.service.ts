import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoServerError } from 'mongodb';

import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Customer } from '../customers/schemas/customer.schema';
import { FirebaseService } from '../firebase/firebase.service';
import { Conversation } from '../messages/schemas/conversation.schema';
import { Message } from '../messages/schemas/message.schema';
import { Booking } from './schema/booking.schema';
import { throwInternalServerError } from '../common/utils/error-utils';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { SuccessResponse } from '../common/dto/success-response.dto';

const slots = [
  {
    start_time: '8:00 AM',
    end_time: '11:00 AM',
    is_booked: false,
    customer_id: null,
  },
  {
    start_time: '12:00 PM',
    end_time: '03:00 PM',
    is_booked: false,
    customer_id: null,
  },
  {
    start_time: '04:00 PM',
    end_time: '07:00 PM',
    is_booked: false,
    customer_id: null,
  },
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly firebaseService: FirebaseService,
  ) {}
  async create(createBookingDto: CreateBookingDto) {
    try {
      const bookings = createBookingDto.bookings.map((booking) => ({
        ...booking,
        slots,
      }));
      const created = await this.bookingModel.insertMany(bookings);

      return new SuccessResponse(
        {
          bookings: created,
        },
        201,
      );
    } catch (error) {
      if ((error as MongoServerError).code === 11000) {
        const mongoError = error as MongoServerError;

        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'date',
              message: mongoError.errmsg || mongoError.message,
            },
          ]),
        );
      }
      throwInternalServerError();
    }
  }

  findAll() {
    return `This action returns all bookings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
