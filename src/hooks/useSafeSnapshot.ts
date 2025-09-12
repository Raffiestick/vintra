
"use client";
import { useEffect, useRef } from "react";

/**
 * Wraps an onSnapshot factory so it only remains active while the component is mounted.
 * The factory must return the unsubscribe function from onSnapshot (or void).
 */
export function useSafeSnapshot(factory: () => (() => void) | void, deps: any[]) {
  const unsubRef = useRef<null | (() => void)>(null);
  useEffect(() => {
    // cleanup any previous listener
    unsubRef.current?.();
    unsubRef.current = null;

    const result = factory();
    if (typeof result === "function") unsubRef.current = result;

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
