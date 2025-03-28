import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsumableDocument = HydratedDocument<Consumable>;

@Schema()
export class Consumable {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;
}

export const ConsumableSchema = SchemaFactory.createForClass(Consumable);
