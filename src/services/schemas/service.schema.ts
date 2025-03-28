import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { VehicleSize, VehicleType } from '../../common/enum';

export type ServiceDocument = HydratedDocument<Service>;

@Schema({ _id: false })
export class PriceList {
  @Prop({ required: true, enum: VehicleSize })
  size: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  points: number;

  @Prop({ required: true, min: 0 })
  earning_points: number;
}

export const PriceListSchema = SchemaFactory.createForClass(PriceList);

@Schema()
export class Service {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: VehicleType })
  type: string;

  @Prop({ type: [PriceListSchema], required: true })
  price_list: PriceList[];

  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  ratings: string;

  @Prop({ required: true })
  reviews_count: string;

  @Prop()
  last_review?: Date;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
