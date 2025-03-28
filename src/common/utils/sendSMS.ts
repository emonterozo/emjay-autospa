/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { MessageType } from '../enum';

export async function sendSMS(
  contactNumber: string,
  type: MessageType,
  otp: number,
  configService: ConfigService,
) {
  const url: string = configService.get<string>('SMS_GATEWAY_URL')!;
  const username: string = configService.get<string>('SMS_GATEWAY_USERNAME')!;
  const password: string = configService.get<string>('SMS_GATEWAY_PASSWORD')!;

  const message =
    type === MessageType.VERIFICATION
      ? 'Thank you for registering! Your EmJay AutoSpa & Detailing verification code is:'
      : 'Your EmJay AutoSpa & Detailing password reset verification code is:';

  try {
    const response = await axios.post(
      url,
      {
        message: `${message} ${otp}`,
        phoneNumbers: [`+63${contactNumber.substring(1)}`],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username,
          password,
        },
      },
    );

    console.log(response);
    return { success: true };
  } catch {
    return { success: false };
  }
}
