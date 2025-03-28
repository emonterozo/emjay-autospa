import { IsEnum, IsOptional } from 'class-validator';

import { TransactionStatus } from '../../common/enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetTransactionDto extends PaginationDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}
