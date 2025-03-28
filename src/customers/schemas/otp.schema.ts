import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema()
export class Otp {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Customer' })
  customer_id: Types.ObjectId;

  @Prop({ required: true })
  otp: number;

  @Prop({ type: Date, default: Date.now, expires: 290 })
  created_at: number;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
