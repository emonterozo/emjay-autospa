import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromoDocument = HydratedDocument<Promo>;

@Schema()
export class Promo {
  @Prop({ required: true })
  percent: number;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  is_free: boolean;

  @Prop({ required: true })
  is_active: boolean;
}

export const PromoSchema = SchemaFactory.createForClass(Promo);
