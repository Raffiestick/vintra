
// src/lib/firebase/functions.ts
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const region = "us-central1";

/**
 * Gets the client-side Firebase Functions instance.
 * Throws an error if called on the server.
 * This should only be called from within client components or useEffect hooks.
 */
export async function getClientFunctions() {
  if (typeof window === 'undefined') {
    throw new Error("Firebase Functions can only be used on the client.");
  }
  // We dynamically import the functions module here as well to ensure
  // it's tree-shaken from any server-side bundles.
  const { getFunctions } = await import("firebase/functions");
  const functions = getFunctions(getApp(), region);
  const { httpsCallable } = await import("firebase/functions");

  return { functions, httpsCallable };
}
