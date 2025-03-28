import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { IsValidDate } from '../../common/decorator/is-valid-date.decorator';
import { ExpenseCategory } from '../../common/enum';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsValidDate('date')
  date: Date;
}
