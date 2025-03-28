import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';
import { Transform } from 'class-transformer';

import { DateRangeDto, PaginationDto } from '../../common/dto/pagination.dto';

export class GetCompletedTransactionDto extends PaginationDto {
  @IsOptional()
  @IsMongoId()
  customer_id?: Types.ObjectId;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
  })
  assigned_employees?: Types.ObjectId[];

  @IsNotEmpty()
  declare date_range: DateRangeDto;
}
