import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { join } from 'path';

@Injectable()
export class NotificationService {
  constructor() {
    if (!admin.apps.length) {
      const serviceAccount = require(
        join(
          process.cwd(),
          'src/config/thoixinproject-firebase-adminsdk-fbsvc-b6e894dd36.json',
        ),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  async sendPushNotification(token: string, title: string, body: string) {
    const message = {
      notification: {
        title,
        body,
      },
      token,
    };
    try {
      const response = await admin.messaging().send(message);
      return { success: true, response };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }
  }
}
