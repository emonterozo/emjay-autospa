import { Controller, Post, Body } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountDto } from './dto/account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('/login')
  login(@Body() accountDto: AccountDto) {
    return this.accountsService.login(accountDto);
  }
}
