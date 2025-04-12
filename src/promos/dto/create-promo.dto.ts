import { IsBoolean, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreatePromoDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  percent: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsBoolean()
  is_active: boolean;
}
