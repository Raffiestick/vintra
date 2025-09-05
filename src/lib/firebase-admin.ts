import * as admin from 'firebase-admin';

// When running in a Google Cloud environment like App Hosting or Cloud Functions,
// the SDK automatically discovers the service account credentials.
// Manually parsing environment variables is not necessary and can be error-prone.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
