import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL: `https://<YOUR_PROJECT_ID>.firebaseio.com` // Optional
  });
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
