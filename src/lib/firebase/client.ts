
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { getFirebaseWebConfig } from './webappConfig';

const cfg = getFirebaseWebConfig();
// Force Storage to use canonical gs:// bucket (avoid .app vs appspot confusion)
const GS_BUCKET = "gs://rizeup-dealer-connect-n6k7r.appspot.com";

const app: FirebaseApp = !getApps().length ? initializeApp(cfg) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app, GS_BUCKET);

const getClientFunctions = (): Functions => {
    const functionsInstance = getFunctions(getApp(), 'us-central1');
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === "localhost") {
        // To connect to the local emulator, you can uncomment the line below,
        // but it's often better to rely on the emulator suite's auto-detection.
        // connectFunctionsEmulator(functionsInstance, "localhost", 5001);
    }
    return functionsInstance;
};

const httpsCallableClient = (name: string) => {
    const functions = getClientFunctions();
    return httpsCallable(functions, name);
};

export { app, auth, db, storage, httpsCallableClient };
