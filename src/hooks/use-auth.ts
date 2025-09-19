"use client";

import { useContext } from "react";
import { AuthContext } from "./use-auth-provider";
export type { AuthState } from "./use-auth-provider";

export function useAuth() {
  return useContext(AuthContext);
}
