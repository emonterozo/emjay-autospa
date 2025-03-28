import { IsNotEmpty } from 'class-validator';

import { DateRangeDto, PaginationDto } from '../../common/dto/pagination.dto';

export class GetWeekSalesDto extends PaginationDto {
  @IsNotEmpty()
  declare date_range: DateRangeDto;
}
