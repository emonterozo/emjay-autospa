import { IsString } from 'class-validator';

export class AccountDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
