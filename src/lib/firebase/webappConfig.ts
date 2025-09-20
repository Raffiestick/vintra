
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
      // The injected config can be stale, so we parse and check the App ID.
      const config = JSON.parse(fromHosting) as WebAppConfig;
      if (config.appId === "1:1000941113781:web:1fb421a893eafe977409fc") {
        return config;
      }
      // If it's the old App ID, fall through to our new hardcoded values.
    } catch {
      // ignore, will fall back below
    }
  }

  // 2) Hardcoded new values as the primary fallback
  return {
    apiKey: "AIzaSyAjhaoaB2BQobm4NWDeJ4ePP-ExVBB77dg",
    authDomain: "rizeup-dealer-connect-n6k7r.firebaseapp.com",
    projectId: "rizeup-dealer-connect-n6k7r",
    storageBucket: "rizeup-dealer-connect-n6k7r.firebasestorage.app",
    messagingSenderId: "1000941113781",
    appId: "1:1000941113781:web:1fb421a893eafe977409fc",
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };
}
