
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
  // Prioritize NEXT_PUBLIC_ variables for local and containerized dev environments
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

  // Fallback for production hosting environment
  const fromHosting = process.env.FIREBASE_WEBAPP_CONFIG;
  if (fromHosting) {
    try {
      return JSON.parse(fromHosting) as WebAppConfig;
    } catch (e) {
      console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
    }
  }

  // Return empty config as a last resort to avoid crashing
  return {
    apiKey: "",
    appId: "",
  };
}
