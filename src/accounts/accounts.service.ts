import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AccountDto } from './dto/account.dto';
import { Account } from './schemas/account.schema';
import { jwtSign } from '../common/utils/jwtSign';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { SuccessResponse } from '../common/dto/success-response.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly configService: ConfigService,
  ) {}
  async login(accountDto: AccountDto) {
    const { username, password } = accountDto;
    const user = await this.accountModel.findOne({ username });

    if (!user)
      throw new UnauthorizedException(
        new ErrorResponse(401, [
          {
            field: 'username or password',
            message: 'Invalid username or password',
          },
        ]),
      );

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      throw new UnauthorizedException(
        new ErrorResponse(401, [
          {
            field: 'username or password',
            message: 'Invalid username or password',
          },
        ]),
      );

    await this.accountModel.findByIdAndUpdate(user._id, {
      $set: { fcm_token: accountDto.fcm_token },
    });

    const userData = {
      _id: user._id.toString(),
      username: user.username,
      type: user.type,
    };

    const { accessToken, refreshToken } = jwtSign(userData, this.configService);

    return new SuccessResponse(
      {
        user: userData,
        accessToken,
        refreshToken,
      },
      200,
    );
  }
}
