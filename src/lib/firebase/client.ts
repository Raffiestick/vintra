
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, connectFunctionsEmulator, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for client-side
const getClientApp = (): FirebaseApp => {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
};

const app: FirebaseApp = getClientApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

const getClientFunctions = (): Functions => {
    const functionsInstance = getFunctions(getApp(), 'us-central1');
    if (process.env.NODE_ENV === 'development') {
        // To connect to the local emulator, uncomment the line below.
        // Make sure you're running the emulator with `firebase emulators:start`
        // connectFunctionsEmulator(functionsInstance, "localhost", 5001);
    }
    return functionsInstance;
};

const httpsCallableClient = (name: string) => {
    const functions = getClientFunctions();
    return httpsCallable(functions, name);
};

export { app, auth, db, storage, httpsCallableClient };
