import {
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class BookingDto {
  @IsDateString(
    {},
    { message: 'Date must be a valid ISO date string (e.g. 2025-07-30).' },
  )
  date: string;

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
