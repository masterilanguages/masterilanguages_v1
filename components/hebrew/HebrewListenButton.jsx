"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { generateLessonAudio } from "@/lib/audio/lessonAudio";
import { shownTransliteration } from "@/lib/hebrew/romanize";

const VARIANTS = {
  dark: "text-cyan-200 hover:bg-white/15 hover:text-white",
  light: "text-stone-500 hover:bg-stone-200/80 hover:text-stone-800",
  amber: "text-amber-700 hover:bg-amber-100",
};

/**
 * Speaker button for a Hebrew word or phrase. Plays a native Israeli voice
 * (he-IL) through the shared lesson-audio player. Shows loading, playing,
 * and a quiet error state. Renders nothing when there is no Hebrew to speak.
 */
export default function HebrewListenButton({
  text,
  className = "",
  variant = "dark",
  label = "Listen in Israeli Hebrew",
}) {
  const hebrew = String(text || "").trim();
  const [state, setState] = useState("idle");
  const playerRef = useRef(null);

  useEffect(() => {
    return () => playerRef.current?.stop();
  }, []);

  if (!/[\u0590-\u05FF]/.test(hebrew)) return null;

  const onClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (state === "playing" || state === "loading") {
      playerRef.current?.stop();
      setState("idle");
      return;
    }
    const player = generateLessonAudio({
      text: hebrew,
      language: "hebrew",
      onState: setState,
    });
    playerRef.current = player;
    if (!player.supported) {
      setState("error");
      return;
    }
    player.play();
  };

  const aria =
    state === "loading"
      ? "Loading Israeli pronunciation"
      : state === "playing"
        ? "Stop pronunciation"
        : state === "error"
          ? "Pronunciation unavailable"
          : label;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      title={aria}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
        VARIANTS[variant] || VARIANTS.dark
      } ${state === "playing" ? "bg-cyan-500/20" : ""} ${state === "error" ? "text-red-400" : ""} ${className}`}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "playing" ? (
        <Square className="h-3 w-3 fill-current" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/** Transliteration line plus the listen button, corrected to the shared standard. */
export function HebrewTranslitLine({
  hebrew,
  transliteration,
  className = "",
  variant = "dark",
}) {
  const shown = shownTransliteration(hebrew, transliteration);
  if (!shown && !/[\u0590-\u05FF]/.test(String(hebrew || ""))) return null;
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {shown ? <span className={className}>{shown}</span> : null}
      <HebrewListenButton text={hebrew} variant={variant} />
    </span>
  );
}
