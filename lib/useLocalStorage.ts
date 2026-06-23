"use client";
import { useState } from "react";

function readStorage<T>(key: string, initial: T): T {
  if (typeof window === "undefined") return initial;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return JSON.parse(stored) as T;
  } catch {}
  return initial;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initial));

  const set = (v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return [value, set] as const;
}
