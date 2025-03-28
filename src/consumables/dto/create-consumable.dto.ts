import { IsInt, IsNumber, IsString, Min } from 'class-validator';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';

export class CreateConsumableDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(1)
  price: number;

  @IsValidDate('date')
  date: Date;
}
