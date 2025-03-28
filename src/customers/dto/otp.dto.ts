import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { MessageType } from '../../common/enum';
import { Types } from 'mongoose';

export class OtpDto {
  @IsMongoId()
  customer_id: Types.ObjectId;

  @IsOptional()
  @IsNumber()
  otp?: number;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(MessageType)
  message_type?: MessageType;
}
