"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SHOW_NIKUD_KEY, stripNikud, vocalizeHebrew } from "@/lib/hebrew/nikud";

const listeners = new Set();

function readPreference() {
  try {
    return localStorage.getItem(SHOW_NIKUD_KEY) === "1";
  } catch {
    return false;
  }
}

function writePreference(on) {
  try {
    localStorage.setItem(SHOW_NIKUD_KEY, on ? "1" : "0");
  } catch { /* ignore */ }
  listeners.forEach((fn) => fn(on));
}

/** Last nikud choice, shared by every phonetics view and saved on this device. */
export function useShowNikud() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(readPreference());
    const fn = (next) => setOn(next);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  const set = (next) => {
    setOn((prev) => {
      const value = typeof next === "boolean" ? next : !prev;
      writePreference(value);
      return value;
    });
  };
  return [on, set];
}

const VARIANTS = {
  dark: "border-white/20 text-white/80 hover:bg-white/10",
  light: "border-stone-300 text-stone-600 hover:bg-stone-100",
  amber: "border-amber-300 text-amber-800 hover:bg-amber-50",
};

/** Add / remove nikud. Only rendered in the phonetics view. */
export function NikudButton({ variant = "light", className = "" }) {
  const [on, setOn] = useShowNikud();
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? "Remove nikud" : "Add nikud"}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        setOn(!on);
      }}
      dir="ltr"
      className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] font-bold leading-none transition ${
        on ? "bg-cyan-500/15 border-cyan-400 text-cyan-700" : VARIANTS[variant] || VARIANTS.light
      } ${className}`}
    >
      <span aria-hidden>{on ? "אָ" : "א"}</span>
      {on ? "Nikud on" : "Nikud"}
    </button>
  );
}

/**
 * Hebrew text in a phonetics view. Nikud on: modern Israeli pointing that
 * matches the transliteration. Nikud off: points in U+0591–U+05C7 removed.
 */
export function HebrewWithNikud({
  text,
  transliteration = "",
  phoneticsView = false,
  showButton = true,
  className = "",
  dir = "rtl",
  variant = "light",
}) {
  const [on] = useShowNikud();
  const source = String(text || "");
  const [shown, setShown] = useState(() => (phoneticsView ? stripNikud(source) : source));
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!phoneticsView || !on) {
      setShown(phoneticsView ? stripNikud(source) : source);
      setLoading(false);
      setMissing(false);
      return undefined;
    }
    let cancel = false;
    setLoading(true);
    setMissing(false);
    vocalizeHebrew(source, transliteration).then((result) => {
      if (cancel) return;
      const pointed = result?.text || stripNikud(source);
      setShown(pointed);
      setMissing(result?.status !== "pointed");
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [source, transliteration, phoneticsView, on]);

  if (!source) return null;

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5" dir={dir}>
      <span className={className} dir={dir}>{shown}</span>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin opacity-60" /> : null}
      {missing ? (
        <span dir="ltr" className="text-[10px] font-semibold text-amber-300" title="Nikud could not be added">
          no nikud
        </span>
      ) : null}
      {phoneticsView && showButton ? <NikudButton variant={variant} /> : null}
    </span>
  );
}
