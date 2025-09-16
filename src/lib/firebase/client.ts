
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  app = getApps().length > 0 ? getApp() : ({} as FirebaseApp);
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

const getClientFunctions = () => {
    if (typeof window === 'undefined') {
        throw new Error("Firebase Functions can only be used on the client.");
    }
    const functions = getFunctions(getApp(), 'us-central1');
    if (process.env.NODE_ENV === 'development') {
        // To connect to the local emulator, uncomment the line below.
        // Make sure you're running the emulator with `firebase emulators:start`
        // connectFunctionsEmulator(functions, "localhost", 5001);
    }
    return functions;
}

const httpsCallableClient = (name: string) => {
    const functions = getClientFunctions();
    return httpsCallable(functions, name);
};


export { app, auth, db, storage, httpsCallableClient };
