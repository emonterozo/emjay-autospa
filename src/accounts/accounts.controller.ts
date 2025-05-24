import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AccountsService } from './accounts.service';
import { AccountDto } from './dto/account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('/login')
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(
    @Body() accountDto: AccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.accountsService.login(accountDto);
    res.status(result?.statusCode ?? 200).json(result);
  }
}
