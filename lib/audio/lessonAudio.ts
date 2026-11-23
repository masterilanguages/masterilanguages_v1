"use client";

// Reusable lesson text-to-speech.
//
// Same contract as backpack-saas lib/audio/lessonAudio.ts: pages call
// `generateLessonAudio({ text, language })` and drive the returned player.
// They do not construct utterances themselves.
//
// Hebrew (he-IL) prefers a cached native Israeli neural voice from
// /api/hebrew/speak (Azure he-IL-HilaNeural, then Google he-IL Neural2, then
// ElevenLabs multilingual). If none of those is configured, or the request
// fails, playback falls back to the browser Web Speech API with lang he-IL —
// which is what the Backpack platform does today.

export type LessonLanguage =
  | "hebrew"
  | "english"
  | "spanish"
  | "french"
  | "portuguese"
  | "italian"
  | string;

export type LessonAudioState = "idle" | "loading" | "playing" | "error";

export interface GenerateLessonAudioOptions {
  /** The text to speak, in the target language. */
  text: string;
  /** Target language name as used across the app (e.g. "hebrew", "spanish"). */
  language: LessonLanguage;
  /** Optional preferred voice name (matched loosely against installed voices). */
  voicePreference?: string;
  /** Playback rate. 1 = normal. Clamped to [0.5, 1.5]. */
  speed?: number;
  /** Loading / playing / error. Optional; existing callers can ignore it. */
  onState?: (state: LessonAudioState) => void;
}

export interface LessonAudioPlayer {
  /** Start (or restart) playback from the beginning. */
  play: () => void;
  /** Pause playback; `play()` restarts from the beginning. */
  pause: () => void;
  /** Stop and clear any queued speech. */
  stop: () => void;
  /** Whether audio can actually be produced in this environment. */
  readonly supported: boolean;
}

const LANGUAGE_BCP47: Record<string, string> = {
  hebrew: "he-IL",
  english: "en-US",
  spanish: "es-ES",
  french: "fr-FR",
  portuguese: "pt-BR",
  italian: "it-IT",
};

const neuralCache = new Map<string, string>();

type ActivePlayback = {
  stop: () => void;
  onState?: (state: LessonAudioState) => void;
};
let active: ActivePlayback | null = null;

export function toBcp47(language: LessonLanguage): string {
  return LANGUAGE_BCP47[String(language || "").toLowerCase()] || "en-US";
}

function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

function hasHebrewLetters(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function wantsIsraeliVoice(opts: GenerateLessonAudioOptions): boolean {
  const lang = String(opts.language || "").toLowerCase();
  return lang === "hebrew" || lang === "he" || lang === "he-il" || hasHebrewLetters(opts.text || "");
}

function pickVoice(bcp47: string, voicePreference?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const lang = bcp47.toLowerCase();
  const base = lang.split("-")[0];

  if (voicePreference) {
    const byName = voices.find((v) => v.name.toLowerCase().includes(voicePreference.toLowerCase()));
    if (byName) return byName;
  }
  if (base === "he") {
    const hebrew = voices.filter(
      (v) => v.lang.toLowerCase() === "he-il" || v.lang.toLowerCase().startsWith("he")
    );
    const named = hebrew.find((v) => /hila|avri|israel/i.test(v.name));
    if (named) return named;
    if (hebrew[0]) return hebrew[0];
  }
  return (
    voices.find((v) => v.lang.toLowerCase() === lang) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ||
    null
  );
}

const NOOP_PLAYER: LessonAudioPlayer = {
  play: () => {},
  pause: () => {},
  stop: () => {},
  supported: false,
};

function claim(entry: ActivePlayback) {
  if (active && active !== entry) {
    const prev = active;
    active = entry;
    prev.stop();
    prev.onState?.("idle");
  } else {
    active = entry;
  }
}

function browserSpeak(
  opts: GenerateLessonAudioOptions,
  onEnd: () => void
): { speak: () => void; cancel: () => void } {
  const synth = window.speechSynthesis;
  const bcp47 = toBcp47(wantsIsraeliVoice(opts) ? "hebrew" : opts.language);
  const rate = Math.min(1.5, Math.max(0.5, opts.speed ?? 1));
  const build = () => {
    const u = new SpeechSynthesisUtterance(opts.text);
    u.lang = bcp47;
    u.rate = rate;
    const voice = pickVoice(bcp47, opts.voicePreference);
    if (voice) u.voice = voice;
    u.onend = onEnd;
    u.onerror = onEnd;
    return u;
  };
  return {
    speak() {
      synth.cancel();
      synth.resume();
      const speakNow = () => {
        synth.resume();
        synth.speak(build());
      };
      if (!synth.getVoices().length) {
        let done = false;
        const once = () => {
          if (!done) {
            done = true;
            speakNow();
          }
        };
        synth.addEventListener("voiceschanged", once, { once: true });
        setTimeout(once, 400);
      } else {
        setTimeout(speakNow, 60);
      }
    },
    cancel() {
      synth.cancel();
    },
  };
}

async function fetchIsraeliAudio(text: string): Promise<string | null> {
  const key = text.trim();
  const cached = neuralCache.get(key);
  if (cached) return cached;
  const res = await fetch(`/api/hebrew/speak?text=${encodeURIComponent(key)}`);
  const type = res.headers.get("content-type") || "";
  if (!res.ok || type.includes("application/json") || type.startsWith("text/")) return null;
  const blob = await res.blob();
  if (!blob.size) return null;
  const url = URL.createObjectURL(blob);
  neuralCache.set(key, url);
  return url;
}

/**
 * Build a playable audio handle for a piece of lesson text.
 * Safe during SSR: without speech support and without a browser it returns a no-op.
 */
export function generateLessonAudio(opts: GenerateLessonAudioOptions): LessonAudioPlayer {
  const text = String(opts?.text || "").trim();
  if (!text || typeof window === "undefined") return NOOP_PLAYER;

  const israeli = wantsIsraeliVoice({ ...opts, text });
  const browserOk = isSpeechSupported();
  if (!israeli && !browserOk) return NOOP_PLAYER;

  let audio: HTMLAudioElement | null = null;
  let stopped = false;
  const emit = (state: LessonAudioState) => opts.onState?.(state);
  const browser = browserOk ? browserSpeak(opts, () => emit("idle")) : null;

  const entry: ActivePlayback = {
    onState: opts.onState,
    stop() {
      stopped = true;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      browser?.cancel();
    },
  };

  return {
    supported: true,
    play() {
      stopped = false;
      usingBrowser = false;
      claim(entry);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      browser?.cancel();

      if (!israeli) {
        emit("playing");
        browser?.speak();
        return;
      }

      emit("loading");
      void fetchIsraeliAudio(text)
        .then((url) => {
          if (stopped || active !== entry) return;
          if (!url) {
            if (!browser) {
              emit("error");
              return;
            }
            emit("playing");
            browser.speak();
            return;
          }
          const el = new Audio(url);
          audio = el;
          el.playbackRate = Math.min(1.5, Math.max(0.5, opts.speed ?? 1));
          el.onended = () => {
            if (active === entry) emit("idle");
          };
          el.onerror = () => {
            if (stopped || active !== entry) return;
            if (browser) {
              emit("playing");
              browser.speak();
            } else {
              emit("error");
            }
          };
          return el.play().then(() => {
            if (!stopped && active === entry) emit("playing");
          });
        })
        .catch(() => {
          if (stopped || active !== entry) return;
          if (browser) {
            emit("playing");
            browser.speak();
          } else {
            emit("error");
          }
        });
    },
    pause() {
      entry.stop();
      if (active === entry) active = null;
      emit("idle");
    },
    stop() {
      entry.stop();
      if (active === entry) active = null;
      emit("idle");
    },
  };
}
