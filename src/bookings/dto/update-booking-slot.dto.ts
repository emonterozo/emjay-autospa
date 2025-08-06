import { IsEnum, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';
import { BookingAction } from '../../common/enum';

export class UpdateBookingSlotDto {
  @IsMongoId()
  slot_id: Types.ObjectId;

  @IsMongoId()
  service_id: Types.ObjectId;

  @IsEnum(BookingAction)
  action: BookingAction;
}
