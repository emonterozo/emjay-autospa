import { IsEnum, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';
import { BookingScheduledAction } from '../../common/enum';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';

export class UpdateScheduledBookingDto {
  @IsValidDate('date')
  date: string;

  @IsMongoId()
  slot_id: Types.ObjectId;

  @IsEnum(BookingScheduledAction)
  action: BookingScheduledAction;
}
