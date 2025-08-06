import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Gender } from '../../common/enum';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ _id: false })
export class WashServiceCount {
  @Prop({ required: true })
  size: string;

  @Prop({ required: true, min: 0 })
  count: number;
}

export const WashServiceCountSchema =
  SchemaFactory.createForClass(WashServiceCount);

@Schema()
export class Customer {
  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  @Prop({ enum: Gender })
  gender: Gender;

  @Prop({ required: true })
  birth_date: Date;

  @Prop({ required: true })
  contact_number: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String })
  province?: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  barangay?: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;

  @Prop({ type: String })
  distance?: string;

  @Prop({ required: true })
  registered_on: Date;

  @Prop({ required: true })
  is_verified: boolean;

  @Prop({ required: true, min: 0 })
  points: number;

  @Prop({ required: true })
  fcm_token: string;

  @Prop({ type: [WashServiceCountSchema], required: true })
  car_wash_service_count: WashServiceCount[];

  @Prop({ type: [WashServiceCountSchema], required: true })
  moto_wash_service_count: WashServiceCount[];

  @Prop({ type: Date })
  profile_updated_at?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
