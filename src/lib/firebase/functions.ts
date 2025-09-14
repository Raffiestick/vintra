// src/lib/firebase/functions.ts
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const region = "us-central1";
const functions = getFunctions(getApp(), region);

// Generic typed caller
export async function callFn<Req, Res>(name: string, data?: Req): Promise<Res> {
  const fn = httpsCallable<Req, Res>(functions, name);
  const res = await fn(data as Req);
  return res.data as Res;
}

// Convenience calls used by the admin UI
export const cf = {
  createJacketFromUnit: (data: { stagingId: string; unitId: string }) =>
    callFn<typeof data, { success: boolean; path: string }>("createJacketFromUnit", data),

  createJacketsForInvoice: (data: { stagingId: string }) =>
    callFn<typeof data, { success: boolean; created: number }>("createJacketsForInvoice", data),

  manageDealerApplication: (data: { uid: string; action: "approve" | "deny" }) =>
    callFn<typeof data, { success: boolean; message: string }>("manageDealerApplication", data),
};
