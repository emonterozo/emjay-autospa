import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoServerError } from 'mongodb';

import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Customer } from '../customers/schemas/customer.schema';
import { FirebaseService } from '../firebase/firebase.service';
import { Conversation } from '../messages/schemas/conversation.schema';
import { Message } from '../messages/schemas/message.schema';
import { Booking } from './schema/booking.schema';
import {
  throwInternalServerError,
  throwNotFoundException,
} from '../common/utils/error-utils';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { UpdateBookingSlotDto } from './dto/update-booking-slot.dto';
import { BookingAction } from '../common/enum';

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

  async update(updateBookingDto: UpdateBookingDto) {
    const results: Booking[] = [];

    for (const booking of updateBookingDto.bookings!) {
      const updated = await this.bookingModel.findOneAndUpdate(
        { date: booking.date },
        { $set: booking },
        { new: true },
      );

      if (updated) {
        results.push(updated);
      }
    }

    return new SuccessResponse(
      {
        bookings: results,
      },
      200,
    );
  }

  async getBookings() {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const bookings = await this.bookingModel.find(
      {
        date: { $gte: currentDate },
      },
      { date: 1, is_open: 1 },
    );

    return new SuccessResponse(
      {
        bookings,
      },
      200,
    );
  }

  async getUserBooking(customerId: string) {
    const booking = await this.bookingModel.findOne(
      {
        'slots.customer_id': new Types.ObjectId(customerId),
      },
      { date: 1, 'slots.$': 1 },
    );
    if (!booking) {
      return throwNotFoundException(
        '_id',
        'No booking exists for this customer',
      );
    }
    return new SuccessResponse(
      {
        booking,
      },
      200,
    );
  }

  async findDate(date: string) {
    const booking = await this.bookingModel.findOne({ date: date });

    if (!booking) {
      return throwNotFoundException('date', 'Booking date does not exist');
    }

    return new SuccessResponse(
      {
        booking,
      },
      200,
    );
  }

  async updateSlot(
    date: string,
    updateBookingSlotDto: UpdateBookingSlotDto,
    customerId: string,
  ) {
    const { slot_id, action } = updateBookingSlotDto;
    const customerObjectId = new Types.ObjectId(customerId);

    const bookingSlot = await this.bookingModel.findOne(
      { date: date, 'slots._id': slot_id },
      { 'slots.$': 1 },
    );

    if (!bookingSlot) {
      return throwNotFoundException('slot_id', 'Booking slot does not exist');
    }

    if (action === BookingAction.BOOKED) {
      if (bookingSlot.slots[0].is_booked) {
        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'slot_id',
              message: `This ${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time} slot is already booked`,
            },
          ]),
        );
      }

      const booking = await this.bookingModel.findOne({
        date: date,
        'slots._id': slot_id,
      });

      if (booking) {
        const userCurrentBookedSlot = booking.slots.find(
          (slot) =>
            slot.customer_id !== null &&
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            slot.customer_id.toString() === customerObjectId.toString(),
        );

        if (userCurrentBookedSlot) {
          throw new BadRequestException(
            new ErrorResponse(400, [
              {
                field: 'slot_id',
                message: `You already have a booking for this date: ${date}, ${userCurrentBookedSlot.start_time} - ${userCurrentBookedSlot.end_time}`,
              },
            ]),
          );
        } else {
          await this.bookingModel.findOneAndUpdate(
            { date: date, 'slots._id': slot_id },
            {
              $set: {
                'slots.$.is_booked': true,
                'slots.$.customer_id': customerObjectId,
              },
            },
            { new: true },
          );

          return new SuccessResponse(
            {
              date: date,
              time: `${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time}`,
              slot_id: slot_id,
            },
            200,
          );
        }
      }
    } else {
      const result = await this.bookingModel.findOneAndUpdate(
        {
          date: date,
          'slots._id': slot_id,
          'slots.customer_id': customerObjectId,
        },
        {
          $set: {
            'slots.$.is_booked': false,
            'slots.$.customer_id': null,
          },
        },
        { new: true },
      );

      if (!result) {
        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'slot_id',
              message: `This ${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time} slot is not booked by you`,
            },
          ]),
        );
      }

      return new SuccessResponse(
        {
          date: date,
          time: `${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time}`,
          slot_id: slot_id,
        },
        200,
      );
    }
  }
}
