// src/lib/auth/roles.ts

/**
 * Hard-coded admin UIDs for Vintra.
 * Matches what you described:
 *  - 8usUL5P3Lde9UmukTHNhfArzDbs2
 *  - qY0IICPcxOSf8HTHwO83Qz6fxiG3
 */
export const DEV_ADMIN_UIDS = new Set<string>([
    "8usUL5P3Lde9UmukTHNhfArzDbs2",
    "qY0IICPcxOSf8HTHwO83Qz6fxiG3",
  ]);
  
  /**
   * Backward compatibility for places that import { DEV_ADMIN_UID } (single value).
   * Keep the first one as the "primary" — this satisfies existing imports.
   */
  export const DEV_ADMIN_UID = "8usUL5P3Lde9UmukTHNhfArzDbs2";
  
  /** Small helper for client-side checks (UI gating, badges, etc.) */
  export function isHardCodedAdmin(uid?: string | null): boolean {
    return !!uid && DEV_ADMIN_UIDS.has(uid);
  }
  
  /** Optional helper if you’re also using custom claims { admin: true } or { role: 'admin' }. */
  export function hasAdminClaim(token?: Record<string, any>): boolean {
    return !!token && (token.admin === true || token.role === "admin");
  }
  