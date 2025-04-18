import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';
import { AvailedServiceStatus } from '../../common/enum';

export class UpdateAvailedServiceDto {
  @IsNumber()
  discount: number;

  @IsNumber()
  deduction: number;

  @IsBoolean()
  is_free: boolean;

  @IsBoolean()
  is_paid: boolean;

  @IsBoolean()
  is_points_cash: boolean;

  @IsEnum(AvailedServiceStatus)
  status: AvailedServiceStatus;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  assigned_employees?: Types.ObjectId[];
}
