import { useEffect, useState } from "react";

/**
 * A small localStorage-backed state hook.
 * - Reads once on mount.
 * - Persists on change.
 * - Handles JSON parse errors gracefully.
 */

// PUBLIC_INTERFACE
export function useLocalStorageState(key, initialValue) {
  /** This is a public hook. */
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota/security errors; app continues in-memory.
    }
  }, [key, value]);

  return [value, setValue];
}
