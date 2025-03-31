import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { ErrorResponse } from '../dto/error-response.dto';

type Account = {
  _id: string;
  username: string;
  type: string;
};

export type Customer = {
  _id: string;
  username: string;
  first_name: string;
  last_name: string;
  gender: string;
};

export const jwtSign = (
  user: Account | Customer,
  configService: ConfigService,
) => {
  const tokenSecret: string = configService.get<string>('TOKEN_SECRET')!;
  const refreshTokenSecret: string = configService.get<string>(
    'REFRESH_TOKEN_SECRET',
  )!;

  if (!tokenSecret || !refreshTokenSecret) {
    throw new InternalServerErrorException(
      new ErrorResponse(500, [
        { field: 'env', message: 'Missing configuration' },
      ]),
    );
  }

  const accessToken: string = jwt.sign({ user }, tokenSecret, {
    expiresIn: '1m',
  });

  const refreshToken = jwt.sign({ user }, refreshTokenSecret, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};
