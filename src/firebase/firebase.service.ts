import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

interface BaseMessage {
  data: {
    [key: string]: string;
  };
}

type PushNotificationParams = {
  title: string;
  body: string;
  data?: BaseMessage['data'];
};

type PushNotificationSingleParams = PushNotificationParams & {
  type: 'single';
  deviceToken: string;
};

type PushNotificationMultipleParams = PushNotificationParams & {
  type: 'multiple';
  deviceTokens: string[];
};

type SendPushNotificationParams =
  | PushNotificationSingleParams
  | PushNotificationMultipleParams;

@Injectable()
export class FirebaseService {
  constructor(
    @Inject('FIREBASE_APP') private readonly firebaseApp: admin.app.App,
  ) {}

  // Send a push notification to a specific device
  async sendPushNotification(params: SendPushNotificationParams): Promise<any> {
    const { title, body, data, type } = params;

    if (type === 'multiple') {
      const message: admin.messaging.MulticastMessage = {
        tokens: params.deviceTokens,
        data: {
          ...data,
          title,
          body,
        },
      };

      try {
        const response = await this.firebaseApp
          .messaging()
          .sendEachForMulticast(message);
        return response;
      } catch (error) {
        return error;
      }
    } else {
      const message: admin.messaging.Message = {
        token: params.deviceToken,
        data: {
          ...data,
          title,
          body,
        },
      };

      try {
        const response = await this.firebaseApp.messaging().send(message);
        return response;
      } catch (error) {
        return error;
      }
    }
  }
}
