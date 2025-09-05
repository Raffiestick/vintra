import * as admin from 'firebase-admin';

// Parse the service account JSON from the environment variable.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

// Initialize the app only if it hasn't been initialized yet.
if (!admin.apps.length) {
  admin.initializeApp({
    // Use the parsed service account.
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
