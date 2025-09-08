
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
};

// Initialize Firebase on the client side only
const app: FirebaseApp = typeof window !== 'undefined' && !getApps().length
  ? initializeApp(firebaseConfig)
  : getApps().length
  ? getApp()
  : {} as FirebaseApp; // Provide a mock app for server-side build

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Client-only accessor for Functions. It uses a dynamic import so
 * the `firebase/functions` package is never bundled into the server build.
 */
export async function getClientFunctions() {
  if (typeof window !== 'undefined') {
    const functions = getFunctions(app, 'us-central1');
    if (process.env.NODE_ENV === 'development') {
      // Uncomment the following line to connect to the local functions emulator
      // connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    return functions;
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
