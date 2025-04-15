import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Customer } from '../../customers/schemas/customer.schema';
import { ChatReference } from '../../common/enum';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: false })
export class LastMessage {
  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, enum: ChatReference })
  from: ChatReference;
}

@Schema()
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer_id: Types.ObjectId | Customer;

  @Prop({ required: true })
  emjay_unread_count: number;

  @Prop({ required: true })
  customer_unread_count: number;

  @Prop({ type: LastMessage, required: true })
  last_message: LastMessage;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
