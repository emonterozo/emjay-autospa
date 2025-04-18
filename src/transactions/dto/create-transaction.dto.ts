import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { Types } from 'mongoose';

import {
  ServiceCharge,
  TransactionStatus,
  VehicleSize,
  VehicleType,
} from '../../common/enum';
import { IsValidPhoneNumber } from '../../common/validator/is-valid-phone-number.validator';

export class CreateTransactionDto {
  @IsOptional()
  @IsMongoId()
  customer_id?: Types.ObjectId;

  @IsEnum(VehicleType)
  vehicle_type: VehicleType;

  @IsEnum(VehicleSize)
  vehicle_size: VehicleSize;

  @IsString()
  model: string;

  @IsString()
  plate_number: string;

  @IsOptional()
  @IsString()
  @Validate(IsValidPhoneNumber)
  contact_number?: string;

  @IsMongoId()
  service_id: Types.ObjectId;

  @IsNumber()
  price: number;

  @IsNumber()
  discount: number;

  @IsNumber()
  deduction: number;

  @IsEnum(ServiceCharge)
  service_charge: ServiceCharge;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status: TransactionStatus;
}
