import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';
import { throwInternalServerError } from '../common/utils/error-utils';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { formatTimestamp } from '../common/utils/date-utils';
import { Customer } from '../customers/schemas/customer.schema';
import { ChatReference } from 'src/common/enum';
import { differenceInHours, formatDate, formatDistanceToNow } from 'date-fns';

type CustomerWithId = Pick<Customer, 'first_name' | 'last_name' | 'gender'> & {
  _id: Types.ObjectId;
};

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
  ) {}

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit, offset } = paginationDto;
      const query = this.conversationModel.find();
      const totalCountQuery = this.conversationModel.find();

      query.sort({ 'last_message.timestamp': 'desc' });

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      const totalCount = await totalCountQuery.countDocuments();

      const data = await query
        .populate<{
          customer_id: CustomerWithId;
        }>('customer_id', 'first_name last_name gender')
        .lean()
        .exec();

      const messages = data.map((item) => {
        const date = new Date(item.last_message.timestamp);
        const now = new Date();

        const hoursAgo = differenceInHours(now, date);

        return {
          _id: item._id,
          customer_id: item.customer_id._id,
          first_name: item.customer_id?.first_name ?? 'Emjay',
          last_name: item.customer_id?.last_name ?? 'Customer',
          gender: item.customer_id?.gender ?? 'MALE',
          emjay_unread_count: item.emjay_unread_count,
          customer_unread_count: item.customer_unread_count,
          last_message: {
            ...item.last_message,
            timestamp:
              hoursAgo <= 48
                ? formatDistanceToNow(date, { addSuffix: true })
                : formatDate(date, 'MMM dd'),
          },
        };
      });

      return new SuccessResponse({ messages, totalCount });
    } catch {
      throwInternalServerError();
    }
  }

  async findConversation(
    id: ObjectIdDto['customer_id'],
    paginationDto: PaginationDto,
  ) {
    try {
      const { limit, offset } = paginationDto;

      const query = this.messageModel
        .find({
          customer_id: new Types.ObjectId(id),
        })
        .sort({ timestamp: 'desc' });

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      const rawMessages = await query;

      const messages = rawMessages.map((item) => {
        const timestamp = formatTimestamp(item.timestamp);

        return {
          ...item.toObject(),
          timestamp: timestamp,
        };
      });

      const totalCount = await this.messageModel
        .find({ customer_id: new Types.ObjectId(id) })
        .countDocuments();

      return new SuccessResponse({ messages, totalCount });
    } catch {
      throwInternalServerError();
    }
  }

  async update(
    id: ObjectIdDto['customer_id'],
    updateMessageDto: UpdateMessageDto,
  ) {
    try {
      await this.messageModel.updateMany(
        {
          customer_id: new Types.ObjectId(id),
          from:
            updateMessageDto.view_by === ChatReference.EMJAY
              ? ChatReference.CUSTOMER
              : ChatReference.EMJAY,
        },
        { $set: { is_read: true } },
      );

      await this.conversationModel.updateMany(
        { customer_id: new Types.ObjectId(id) },
        {
          $set:
            updateMessageDto.view_by === ChatReference.EMJAY
              ? {
                  emjay_unread_count: 0,
                }
              : {
                  customer_unread_count: 0,
                },
        },
      );

      return new SuccessResponse({ _id: id });
    } catch {
      throwInternalServerError();
    }
  }
}
