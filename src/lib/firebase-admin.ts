import * as admin from 'firebase-admin';

// This file is now deprecated and will be removed in a future step.
// All admin SDK logic should be in the `functions` directory.
// For now, we keep it to avoid breaking other parts of the app that might still import it.
// The `initializeApp` call is safe because it checks for existing apps.
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
