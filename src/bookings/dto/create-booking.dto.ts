import {
  IsArray,
  ValidateNested,
  IsBoolean,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';

export class DateStringDto {
  @IsValidDate('date')
  date: string;
}

export class BookingDto extends DateStringDto {
  @IsBoolean()
  is_open: boolean;
}

export class CreateBookingDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Bookings array must contain at least one item.' })
  @ValidateNested({ each: true })
  @Type(() => BookingDto)
  bookings: BookingDto[];
}
