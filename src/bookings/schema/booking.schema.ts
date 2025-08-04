import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { addMonths } from 'date-fns';

import { Customer } from '../../customers/schemas/customer.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema()
export class Slot {
  @Prop()
  _id?: Types.ObjectId;

  @Prop({ required: true })
  start_time: string;

  @Prop({ required: true })
  end_time: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer_id: Types.ObjectId | Customer;

  @Prop({ required: true })
  is_completed: boolean;
}

const SlotSchema = SchemaFactory.createForClass(Slot);

@Schema()
export class Booking {
  @Prop({ required: true, type: Date, unique: true })
  date: Date;

  @Prop({ required: true })
  is_open: boolean;

  @Prop({ type: [SlotSchema], default: [] })
  slots: Slot[];

  @Prop({
    type: Date,
    default: () => addMonths(new Date(), 2),
    expires: 0,
  })
  expireAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
