import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoServerError, ObjectId } from 'mongodb';
import { addDays, format, isBefore, isSameDay } from 'date-fns';

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
import { BookingAction, BookingScheduledAction } from '../common/enum';
import { Account } from '../accounts/schemas/account.schema';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateScheduledBookingDto } from './dto/update-scheduled-booking.dto';
import { Service } from '../services/schemas/service.schema';

const slots = [
  {
    start_time: '8:00 AM',
    end_time: '11:00 AM',
    distance: null,
    service_id: null,
    customer_id: null,
    is_completed: false,
  },
  {
    start_time: '12:00 PM',
    end_time: '03:00 PM',
    distance: null,
    service_id: null,
    customer_id: null,
    is_completed: false,
  },
  {
    start_time: '04:00 PM',
    end_time: '07:00 PM',
    distance: null,
    service_id: null,
    customer_id: null,
    is_completed: false,
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
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<Service>,
    private readonly firebaseService: FirebaseService,
  ) {}

  sendBookingNotification = async ({
    action,
    date,
    timeSlot,
    customerId,
  }: {
    action: BookingAction;
    date: string;
    timeSlot: string;
    customerId: string;
  }) => {
    const formattedDate = format(new Date(date), 'MMMM dd, yyyy');

    const customer = await this.customerModel.findById(
      new ObjectId(customerId),
    );

    const accounts = await this.accountModel.find().select('fcm_token').lean();

    const tokens = accounts.map((item) => item.fcm_token);

    const title =
      action === BookingAction.BOOKED
        ? 'Booking Confirmation'
        : 'Booking Cancellation';

    const body =
      action === BookingAction.BOOKED
        ? `Your booking for ${formattedDate} is confirmed.`
        : `Your booking for ${formattedDate} has been cancelled.`;

    const message =
      action === BookingAction.BOOKED
        ? `You have successfully booked a slot on ${formattedDate} from ${timeSlot}.`
        : `You have successfully cancelled your booking for ${formattedDate} from ${timeSlot}.`;

    const customerName = `${customer?.first_name} ${customer?.last_name}`;

    const adminNotificationBody =
      action === BookingAction.BOOKED
        ? `${customerName} booked a slot on ${formattedDate} from ${timeSlot}.`
        : `${customerName} cancelled booking for ${formattedDate} from ${timeSlot}.`;

    if (!customer) return;

    await this.messageModel.create({
      customer_id: customer._id,
      message: message,
      timestamp: new Date(),
      from: 'emjay',
      is_read: false,
    });

    await this.conversationModel.findOneAndUpdate(
      { customer_id: customer._id },
      {
        $set: {
          last_message: {
            message: message,
            timestamp: new Date(),
            from: 'emjay',
          },
        },
        $inc: {
          customer_unread_count: 1,
        },
        $setOnInsert: {
          customer_id: customer._id,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    if (action === BookingAction.BOOKED) {
      const forAdminMessage = `Hello Emjay! Just sending you my location for my scheduled booking so you can find me easily: https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`;

      await this.messageModel.create({
        customer_id: customer._id,
        message: forAdminMessage,
        timestamp: new Date(),
        from: 'customer',
        is_read: false,
      });

      await this.conversationModel.findOneAndUpdate(
        { customer_id: customer._id },
        {
          $set: {
            last_message: {
              message: forAdminMessage,
              timestamp: new Date(),
              from: 'customer',
            },
          },
          $inc: {
            emjay_unread_count: 1,
          },
          $setOnInsert: {
            customer_id: customer._id,
          },
        },
        {
          new: true,
          upsert: true,
        },
      );
    }

    await this.firebaseService.sendPushNotification({
      type: 'single',
      title: title,
      body: body,
      deviceToken: customer?.fcm_token,
      data: {
        type: 'message',
        id: customer._id.toString(),
      },
    });

    await this.firebaseService.sendPushNotification({
      title: title,
      body: adminNotificationBody,
      type: 'multiple',
      deviceTokens: tokens,
    });
  };

  async create(createBookingDto: CreateBookingDto) {
    try {
      const bookings = createBookingDto.bookings.map((booking) => ({
        ...booking,
        slots,
      }));
      console.log(slots);
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

  async getBookings(customerId: string) {
    const currentDate = addDays(new Date(), 1);
    currentDate.setHours(0, 0, 0, 0);
    const bookings = await this.bookingModel.find(
      {
        date: { $gte: currentDate },
      },
      { date: 1, is_open: 1 },
    );

    let userData: unknown = undefined;

    const userBooking = await this.bookingModel.findOne(
      {
        slots: {
          $elemMatch: {
            customer_id: new Types.ObjectId(customerId),
            is_completed: false,
          },
        },
      },
      { date: 1, 'slots.$': 1 },
    );

    if (userBooking) {
      const service = await this.serviceModel.findById(
        userBooking.slots[0].service_id,
      );

      const objectData = userBooking.toObject();

      userData = {
        ...objectData,
        slots: [
          {
            ...objectData.slots[0],
            service_title: service?.title,
            service_image: service?.image,
          },
        ],
      };
    }

    return new SuccessResponse(
      {
        bookings,
        user_booking: userData,
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
    const { slot_id, service_id, action } = updateBookingSlotDto;

    const customerObjectId = new ObjectId(customerId);
    const currentDate = new Date();

    const customer = await this.customerModel.findById(customerObjectId);

    if (!customer) return;

    if (
      isBefore(new Date(date), currentDate) &&
      action === BookingAction.BOOKED
    )
      throw new BadRequestException(
        new ErrorResponse(400, [
          {
            field: 'date',
            message: 'Booking for past dates is no longer allowed.',
          },
        ]),
      );

    if (isSameDay(new Date(date), currentDate))
      throw new BadRequestException(
        new ErrorResponse(400, [
          {
            field: 'date',
            message:
              action === BookingAction.BOOKED
                ? 'Same day bookings are not allowed.'
                : 'You can no longer cancel this booking as it is scheduled for today.',
          },
        ]),
      );

    const bookingSlot = await this.bookingModel.findOne(
      { date: date, 'slots._id': new ObjectId(slot_id) },
      { 'slots.$': 1 },
    );

    if (!bookingSlot) {
      return throwNotFoundException('slot_id', 'Booking slot does not exist');
    }

    if (action === BookingAction.BOOKED) {
      if (bookingSlot.slots[0].customer_id) {
        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'slot_id',
              message: `This ${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time} slot is already booked.`,
            },
          ]),
        );
      }

      const booking = await this.bookingModel.findOne({
        date: date,
        'slots._id': new ObjectId(slot_id),
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
                message: `You already have a booking for this date: ${date}, ${userCurrentBookedSlot.start_time} - ${userCurrentBookedSlot.end_time}.`,
              },
            ]),
          );
        } else {
          await this.bookingModel.findOneAndUpdate(
            { date: date, 'slots._id': new ObjectId(slot_id) },
            {
              $set: {
                'slots.$.service_id': new ObjectId(service_id),
                'slots.$.customer_id': customerObjectId,
                'slots.$.distance': customer.distance,
              },
            },
            { new: true },
          );

          await this.sendBookingNotification({
            action: BookingAction.BOOKED,
            date: date,
            timeSlot: `${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time}`,
            customerId: customerObjectId.toString(),
          });

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
          'slots._id': new ObjectId(slot_id),
          'slots.customer_id': customerObjectId,
        },
        {
          $set: {
            'slots.$.distance': null,
            'slots.$.customer_id': null,
            'slots.$.service_id': null,
          },
        },
        { new: true },
      );
      if (!result) {
        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'slot_id',
              message: `This ${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time} slot is not booked by you.`,
            },
          ]),
        );
      }

      await this.sendBookingNotification({
        action: BookingAction.UNBOOKED,
        date: date,
        timeSlot: `${bookingSlot.slots[0].start_time} - ${bookingSlot.slots[0].end_time}`,
        customerId: customerObjectId.toString(),
      });

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

  async getScheduledServices(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    try {
      const pipeline: any[] = [
        { $unwind: '$slots' },
        {
          $match: {
            'slots.customer_id': { $ne: null },
            'slots.is_completed': false,
          },
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'slots.customer_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: '$customer' },
        {
          $lookup: {
            from: 'services',
            localField: 'slots.service_id',
            foreignField: '_id',
            as: 'service',
          },
        },
        { $unwind: '$service' },
        {
          $project: {
            _id: 1,
            date: 1,
            slot_id: '$slots._id',
            start_time: '$slots.start_time',
            end_time: '$slots.end_time',
            is_completed: '$slots.is_completed',
            customer: {
              _id: '$customer._id',
              first_name: '$customer.first_name',
              last_name: '$customer.last_name',
              gender: '$customer.gender',
              distance: '$customer.distance',
            },
            service: {
              _id: '$service._id',
              title: '$service.title',
              type: '$service.type',
            },
          },
        },
      ];

      if (limit && limit > 0) pipeline.push({ $limit: limit });
      if (offset && offset > 0) pipeline.push({ $skip: offset });

      const bookings = await this.bookingModel.aggregate(pipeline);

      const result = await this.bookingModel.aggregate<{ total: number }>([
        { $unwind: '$slots' },
        {
          $match: {
            'slots.customer_id': { $ne: null },
            'slots.is_completed': false,
          },
        },
        { $count: 'total' },
      ]);

      return new SuccessResponse(
        {
          bookings,
          totalCount: result[0]?.total || 0,
        },
        200,
      );
    } catch {
      throwInternalServerError();
    }
  }

  async updateScheduledBooking(
    updateScheduledBookingDto: UpdateScheduledBookingDto,
  ) {
    const { date, slot_id, action } = updateScheduledBookingDto;

    const updateFields: Record<string, any> = {};

    if (action === BookingScheduledAction.CANCEL) {
      updateFields['slots.$.customer_id'] = null;
      updateFields['slots.$.service_id'] = null;
      updateFields['slots.$.distance'] = null;
    } else {
      updateFields['slots.$.is_completed'] = true;
    }

    const bookingSlot = await this.bookingModel.findOneAndUpdate(
      { date, 'slots._id': new ObjectId(slot_id) },
      { $set: updateFields },
    );

    if (!bookingSlot)
      return throwNotFoundException('slot_id', 'Booking slot does not exist');

    const selectedSlot = bookingSlot.slots.find(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (slot: any) => slot._id?.toString() === slot_id.toString(),
    );

    const customerId = selectedSlot?.customer_id;

    const customer = await this.customerModel.findById(customerId);

    const slot = `${selectedSlot?.start_time} - ${selectedSlot?.end_time}`;
    const formattedDate = format(new Date(date), 'MMMM dd, yyyy');

    const message =
      action === BookingScheduledAction.CANCEL
        ? `We’ve cancelled your booking scheduled for ${formattedDate} at ${slot}. If you need a new appointment, you can rebook anytime. Thank you!`
        : `Your scheduled service on ${formattedDate} at ${slot} has been successfully completed. Looking forward to serving you again!`;

    const title =
      action === BookingScheduledAction.CANCEL
        ? 'Booking Cancelled'
        : 'Booking Completed';

    const body =
      action === BookingScheduledAction.CANCEL
        ? `Your booking on ${formattedDate} has been cancelled.`
        : `Your scheduled booking on ${formattedDate} is completed.`;

    if (!customer) return;

    await this.messageModel.create({
      customer_id: customerId,
      message: message,
      timestamp: new Date(),
      from: 'emjay',
      is_read: false,
    });

    await this.conversationModel.findOneAndUpdate(
      { customer_id: customerId },
      {
        $set: {
          last_message: {
            message: message,
            timestamp: new Date(),
            from: 'emjay',
          },
        },
        $inc: {
          customer_unread_count: 1,
        },
        $setOnInsert: {
          customer_id: customerId,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    await this.firebaseService.sendPushNotification({
      type: 'single',
      title: title,
      body: body,
      deviceToken: customer?.fcm_token,
      data: {
        type: 'message',
        id: customer._id.toString(),
      },
    });

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
