import { IsEnum, IsString, Validate } from 'class-validator';

import { IsValidPhoneNumber } from '../../common/validator/is-valid-phone-number.validator';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';
import { EmployeeStatus, Gender } from '../../common/enum';

export class CreateEmployeeDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @IsValidDate('birth_date', 18)
  birth_date: string;

  @IsString()
  @Validate(IsValidPhoneNumber)
  contact_number: string;

  @IsString()
  employee_title: string;

  @IsEnum(EmployeeStatus)
  employee_status: EmployeeStatus;

  @IsString()
  @IsValidDate('date_started')
  date_started: string;
}
