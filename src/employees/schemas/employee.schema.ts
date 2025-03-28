import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { EmployeeStatus, Gender } from '../../common/enum';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema()
export class Employee {
  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true, enum: Gender })
  gender: string;

  @Prop({ required: true })
  birth_date: Date;

  @Prop({ required: true })
  contact_number: string;

  @Prop({ required: true })
  employee_title: string;

  @Prop({ required: true, enum: EmployeeStatus })
  employee_status: string;

  @Prop({ required: true })
  date_started: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
