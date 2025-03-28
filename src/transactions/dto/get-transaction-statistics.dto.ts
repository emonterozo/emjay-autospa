import { IsEnum } from 'class-validator';
import { StatisticsFilter } from '../../common/enum';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';

export class GetTransactionStatisticsDto {
  @IsEnum(StatisticsFilter)
  filter: StatisticsFilter;

  @IsValidDate('end')
  end: Date;
}
