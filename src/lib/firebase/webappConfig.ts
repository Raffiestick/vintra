// src/lib/firebase/webappConfig.ts
export type WebAppConfig = {
  apiKey: string;
  appId: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  databaseURL?: string;
};

export function getFirebaseWebConfig(): WebAppConfig {
  // This is the primary and most reliable way to get the config
  // in the App Hosting managed environment.
  const fromHosting = process.env.FIREBASE_WEBAPP_CONFIG;
  if (fromHosting) {
    try {
      return JSON.parse(fromHosting) as WebAppConfig;
    } catch (e) {
      console.error("Critical: Failed to parse FIREBASE_WEBAPP_CONFIG", e);
      // Fall through to other methods, but log the critical failure.
    }
  }

  // Fallback for local development using NEXT_PUBLIC_ variables
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey) {
    return {
      apiKey: apiKey,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    };
  }

  // If neither is available, throw an error to fail fast.
  // This makes it clear that configuration is missing.
  throw new Error("Firebase webapp configuration is not set. Please check environment variables.");
}
