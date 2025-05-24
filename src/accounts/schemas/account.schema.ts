import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AccountType } from '../../common/enum';

export type AccountDocument = HydratedDocument<Account>;

@Schema()
export class Account {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: AccountType })
  type: AccountType;

  @Prop({ required: true })
  fcm_token: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
