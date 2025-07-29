import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { Customer } from '../../customers/schemas/customer.schema';

export type BookingDocument = HydratedDocument<Booking>;

@Schema()
export class Slot {
  @Prop({ required: true })
  start_time: string;

  @Prop({ required: true })
  end_time: string;

  @Prop({ required: true })
  is_booked: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer_id: Types.ObjectId | Customer;
}

const SlotSchema = SchemaFactory.createForClass(Slot);

@Schema()
export class Booking {
  @Prop({ required: true, unique: true })
  date: string;

  @Prop({ required: true })
  is_open: boolean;

  @Prop({ type: [SlotSchema], default: [] })
  slots: Slot[];
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
