import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { MessageType } from '../enum';
import { LoggerService } from '../../logger/logger.service';

export async function sendSMS(
  contactNumber: string,
  type: MessageType,
  otp: number,
  configService: ConfigService,
  loggerService: LoggerService,
) {
  const url: string = configService.get<string>('SMS_GATEWAY_URL')!;
  const username: string = configService.get<string>('SMS_GATEWAY_USERNAME')!;
  const password: string = configService.get<string>('SMS_GATEWAY_PASSWORD')!;

  const message =
    type === MessageType.VERIFICATION
      ? 'Thank you for registering! Your Emjay AutoSpa & Detailing verification code is:'
      : 'Your Emjay AutoSpa & Detailing password reset verification code is:';

  const payload = {
    message: `${message} ${otp}`,
    phoneNumbers: [`+63${contactNumber.substring(1)}`],
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username,
        password,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    loggerService.log('Trying to send OTP', { payload, data: response.data });

    return { success: true };
  } catch (err: unknown) {
    const axiosError = err as AxiosError;

    loggerService.error('Failed to send otp', {
      payload,
      data: axiosError.response?.data,
    });

    return { success: false };
  }
}
