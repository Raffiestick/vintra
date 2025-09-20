
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
  // 1) App Hosting runtime env (preferred)
  const fromHosting = process.env.FIREBASE_WEBAPP_CONFIG;
  if (fromHosting) {
    try {
      return JSON.parse(fromHosting) as WebAppConfig;
    } catch {
      // ignore, will fall back below
    }
  }

  // 2) NEXT_PUBLIC_* fallback (local/dev)
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };
}
