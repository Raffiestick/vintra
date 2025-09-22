import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';
import { webappConfig } from './webappConfig';

// Initialize Firebase
const app = !getApps().length ? initializeApp(webappConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Cloud Functions and pass them the app instance
export const functions = getFunctions(app);

// CORRECTED IMPLEMENTATION: This is a helper that pre-fills the 'functions' instance.
// Now, other files can call it with just the function name, which fixes the error.
export const httpsCallableClient = (name: string) => {
  return httpsCallable(functions, name);
};