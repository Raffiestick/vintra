
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, connectFunctionsEmulator, type Functions } from 'firebase/functions';

// Hardcoded new configuration to ensure the correct keys are used.
const firebaseConfig = {
    apiKey: "AIzaSyAjhaoaB2BQobm4NWDeJ4ePP-ExVBB77dg",
    authDomain: "rizeup-dealer-connect-n6k7r.firebaseapp.com",
    projectId: "rizeup-dealer-connect-n6k7r",
    storageBucket: "rizeup-dealer-connect-n6k7r.firebasestorage.app",
    messagingSenderId: "1000941113781",
    appId: "1:1000941113781:web:1fb421a893eafe977409fc"
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

const getClientFunctions = (): Functions => {
    const functionsInstance = getFunctions(getApp(), 'us-central1');
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === "localhost") {
        // To connect to the local emulator, uncomment the line below.
        // connectFunctionsEmulator(functionsInstance, "localhost", 5001);
    }
    return functionsInstance;
};

const httpsCallableClient = (name: string) => {
    const functions = getClientFunctions();
    return httpsCallable(functions, name);
};

export { app, auth, db, storage, httpsCallableClient };
