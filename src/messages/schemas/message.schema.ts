import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Customer } from '../../customers/schemas/customer.schema';
import { ChatReference } from '../../common/enum';

export type MessageDocument = HydratedDocument<Message>;

@Schema()
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer_id: Types.ObjectId | Customer;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, enum: ChatReference })
  from: ChatReference;

  @Prop({ required: true })
  is_read: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
