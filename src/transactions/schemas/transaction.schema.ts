import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  VehicleType,
  VehicleSize,
  TransactionStatus,
  AvailedServiceStatus,
} from '../../common/enum';
import { Customer } from '../../customers/schemas/customer.schema';
import { Service } from '../../services/schemas/service.schema';
import { Employee } from '../../employees/schemas/employee.schema';

export type TransactionDocument = HydratedDocument<Transaction>;
export type AvailedServiceDocument = HydratedDocument<AvailedService>;

@Schema()
export class AvailedService {
  @Prop({ type: Types.ObjectId, ref: 'Service' })
  service_id: Types.ObjectId | Service;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  discount: number;

  @Prop({ required: true })
  deduction: number;

  @Prop({ required: true })
  company_earnings: number;

  @Prop({ required: true })
  employee_share: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Employee' }] })
  assigned_employee_id: Types.ObjectId[] | Employee[];

  @Prop({ type: Date })
  start_date?: Date;

  @Prop({ type: Date })
  end_date?: Date;

  @Prop({ required: true, enum: AvailedServiceStatus })
  status: AvailedServiceStatus;

  @Prop({ required: true })
  is_free: boolean;

  @Prop({ required: true })
  is_points_cash: boolean;

  @Prop({ required: true })
  is_paid: boolean;
}

export const AvailedServiceSchema =
  SchemaFactory.createForClass(AvailedService);

@Schema()
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer_id: Types.ObjectId | Customer;

  @Prop({ required: true, enum: VehicleType })
  vehicle_type: VehicleType;

  @Prop({ required: true, enum: VehicleSize })
  vehicle_size: VehicleSize;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  plate_number: string;

  @Prop()
  contact_number?: string;

  @Prop({ required: true, type: Date })
  check_in: Date;

  @Prop({ required: true, enum: TransactionStatus })
  status: TransactionStatus;

  @Prop({ type: Date })
  check_out?: Date;

  @Prop({ type: [AvailedServiceSchema], default: [] })
  availed_services: AvailedService[];
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
