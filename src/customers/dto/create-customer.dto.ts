import { IsEnum, IsOptional, IsString, Validate } from 'class-validator';

import { IsValidPhoneNumber } from '../../common/validator/is-valid-phone-number.validator';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';
import { Gender } from '../../common/enum';

export class CreateCustomerDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsValidDate('birth_date', 18)
  birth_date: Date;

  @IsString()
  @Validate(IsValidPhoneNumber)
  contact_number: string;

  @IsString()
  password: string;

  @IsString()
  fcm_token: string;

  @IsOptional()
  @IsString()
  current_password?: string;

  @IsOptional()
  province?: string;

  @IsOptional()
  city?: string;

  @IsOptional()
  barangay?: string;

  @IsOptional()
  address?: string;
}
