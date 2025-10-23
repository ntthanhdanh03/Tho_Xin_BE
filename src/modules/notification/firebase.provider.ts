import * as admin from 'firebase-admin';
import { join } from 'path';

const serviceAccount = require(
  join(
    __dirname,
    '../config/thoixinproject-firebase-adminsdk-fbsvc-b6e894dd36.json',
  ),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
