
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { getFirebaseWebConfig } from "@/lib/firebase/webappConfig";

const cfg = getFirebaseWebConfig();

// Only access window APIs in the browser (defensive)
const app: FirebaseApp = !getApps().length ? initializeApp(cfg) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

const getClientFunctions = (): Functions => {
    const functionsInstance = getFunctions(getApp(), 'us-central1');
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === "localhost") {
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
