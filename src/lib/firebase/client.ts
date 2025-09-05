import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Client-only accessor for Functions. It uses a dynamic import so
 * the `firebase/functions` package is never bundled into the server build.
 */
export async function getClientFunctions() {
  if (typeof window !== 'undefined') {
    const { getFunctions } = await import('firebase/functions');
    return getFunctions(app, 'us-central1');
  }
  return null;
}

/** Helper to lazy-load httpsCallable on the client */
export async function httpsCallableClient<I = unknown, O = unknown>(name: string) {
  const [functions, mod] = await Promise.all([
    getClientFunctions(),
    import('firebase/functions'), // Dynamically import the functions module
  ]);
  if (!functions) {
    throw new Error("Firebase Functions is not available on the server.");
  }
  return mod.httpsCallable<I, O>(functions, name);
}


export { app, auth, db, storage };
