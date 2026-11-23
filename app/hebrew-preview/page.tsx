"use client";

import HebrewListenButton, { HebrewTranslitLine } from "@/components/hebrew/HebrewListenButton";
import { HebrewWithNikud } from "@/components/hebrew/HebrewNikud";
import { SHOW_NIKUD_KEY } from "@/lib/hebrew/nikud";

if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nikud") === "1") {
  localStorage.setItem(SHOW_NIKUD_KEY, "1");
}

const SAMPLES = [
  { hebrew: "ביצה", before: "Beitzah", after: "beitza", english: "egg" },
  { hebrew: "משחק", before: "Misachak", after: "mischak", english: "game" },
  { hebrew: "לצחוק", before: "Litschok", after: "litzchok", english: "to laugh" },
  { hebrew: "שלום", before: "shalom", after: "shalom", english: "hello" },
];

export default function HebrewPreviewPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Hebrew pronunciation</h1>
        <p className="text-sm text-white/60">
          Israeli romanization, a listen button, and nikud you can turn on or off.
        </p>
        {SAMPLES.map((sample) => (
          <article key={sample.hebrew} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3" dir="rtl">
              <HebrewWithNikud
                text={sample.hebrew}
                transliteration={sample.after}
                phoneticsView
                variant="dark"
                className="text-2xl font-bold text-cyan-300"
              />
              <HebrewListenButton text={sample.hebrew} variant="dark" />
            </div>
            <p className="mt-2 text-sm text-white/70">
              <HebrewTranslitLine hebrew={sample.hebrew} transliteration={sample.before} variant="dark" />
            </p>
            <p className="text-xs text-white/40">{sample.english}</p>
            <p className="mt-1 text-xs text-amber-200/80">was {sample.before}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
