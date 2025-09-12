
"use client";
import { useEffect, useRef } from "react";
import { type Unsubscribe } from "firebase/firestore";

/**
 * Wraps an onSnapshot factory so it only remains active while the component is mounted.
 * The factory must return the unsubscribe function from onSnapshot (or void).
 */
export function useSafeSnapshot(factory: () => Unsubscribe | void, deps: any[]) {
  const unsubRef = useRef<Unsubscribe | null>(null);
  
  useEffect(() => {
    // cleanup any previous listener
    if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
    }

    const result = factory();
    if (typeof result === "function") {
        unsubRef.current = result;
    }

    // This is the cleanup function that will be called on unmount or when deps change.
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
