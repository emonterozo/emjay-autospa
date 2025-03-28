import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ExpenseCategory } from '../../common/enum';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema()
export class Expense {
  @Prop({ required: true, enum: ExpenseCategory })
  category: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, type: Date })
  date: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
