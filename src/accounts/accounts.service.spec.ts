import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AccountsService } from './accounts.service';
import { Account } from './schemas/account.schema';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { jwtSign } from '../common/utils/jwtSign';
import { SuccessResponse } from '../common/dto/success-response.dto';

jest.mock('../common/utils/jwtSign', () => ({
  jwtSign: jest.fn(),
}));

describe('AccountsService', () => {
  let accountsService: AccountsService;
  let model: Model<Account>;
  const mockAccountService = {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const mockConfigService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    accountsService = module.get<AccountsService>(AccountsService);
    model = module.get<Model<Account>>(getModelToken(Account.name));
  });

  it('should return error if user not found', async () => {
    jest.spyOn(model, 'findOne').mockResolvedValue(null);

    await expect(accountsService.login({ username: '', password: 'sd', fcm_token: '' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return error if password does not match', async () => {
    const fakeUser = {
      email: 'test@example.com',
      password: 'hashed-password',
    };

    jest.spyOn(model, 'findOne').mockResolvedValue(fakeUser);

    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      accountsService.login({
        username: 'test@example.com',
        password: 'hashed-password-wrong',
        fcm_token: '',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should update FCM token and return user on successful login', async () => {
    const accountDto = {
      username: 'test@example.com',
      password: 'correct-password',
      fcm_token: 'new-fcm-token',
    };

    const user = {
      _id: '1234567',
      username: accountDto.username,
      password: 'hashed-password',
      type: 'ADMIN',
    };

    jest.spyOn(model, 'findOne').mockResolvedValue(user);

    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const updateMock = jest.spyOn(model, 'findByIdAndUpdate').mockResolvedValue(null as any);

    (jwtSign as jest.Mock).mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const result = await accountsService.login(accountDto);

    expect(updateMock).toHaveBeenCalledWith(user._id, {
      $set: { fcm_token: accountDto.fcm_token },
    });

    expect(jwtSign).toHaveBeenCalledWith(
      { _id: user._id, username: user.username, type: user.type },
      expect.any(Object),
    );

    expect(result).toBeInstanceOf(SuccessResponse);
    expect(result.data).toEqual({
      user: {
        _id: user._id,
        username: user.username,
        type: user.type,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result.statusCode).toBe(200);
  });
});
