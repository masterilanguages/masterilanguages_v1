// Nikud (niqqud) for Hebrew shown next to a transliteration.
//
// Stripping uses Unicode U+0591–U+05C7, the same block backpack-saas
// lib/verbs.ts calls POINTS (`/[֑-ׇ]/`). That includes vowel points,
// shin/sin dots, cantillation, maqaf and sof pasuq.
//
// Adding points prefers Dicta Nakdan in the "modern" genre (Israeli Hebrew),
// and picks the option whose pronunciation matches the Latin transliteration.
// If Nakdan is unavailable, the caller falls back to the Backpack quality
// model (claude-opus-5-5) through InvokeLLM. Results are cached so the same
// word does not flicker.

import { displayTransliteration, hasHebrew } from "./romanize.js";

export const NIKUD_BLOCK = /[֑-ׇ]/g;
export const SHOW_NIKUD_KEY = "masteri.hebrew.showNikud";
const CACHE_KEY = "masteri.hebrew.nikud.v1";

const memory = new Map();
const inflight = new Map();

export function stripNikud(text) {
  return String(text || "").replace(NIKUD_BLOCK, "");
}

export function hasNikud(text) {
  NIKUD_BLOCK.lastIndex = 0;
  return NIKUD_BLOCK.test(String(text || ""));
}

export function sameLetters(a, b) {
  const norm = (s) => stripNikud(s).replace(/\|/g, "").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

function plainLatin(value) {
  return String(value || "").toLowerCase().replace(/[^a-z]+/g, "");
}

function normalizeOption(option) {
  if (!option) return "";
  if (typeof option === "string") return option.replace(/\|/g, "");
  if (typeof option.word === "string") return option.word.replace(/\|/g, "");
  if (typeof option.w === "string") return option.w.replace(/\|/g, "");
  return "";
}

function matchesHint(pointed, hint) {
  const want = plainLatin(hint);
  if (!want) return false;
  const got = plainLatin(displayTransliteration(pointed, ""));
  return got === want;
}

export function chooseNikudOption(options, hint, originalWord = "") {
  const list = (options || []).map(normalizeOption).filter(Boolean);
  if (!list.length) return "";
  const faithful = originalWord ? list.filter((opt) => sameLetters(opt, originalWord)) : list;
  const pool = faithful.length ? faithful : list;
  if (hint) {
    const match = pool.find((opt) => matchesHint(opt, hint));
    if (match) return match;
  }
  return pool[0];
}

/**
 * Join a Dicta Nakdan payload into one string.
 * `tokens` is the array Nakdan returns: words plus separator tokens.
 * When `transliteration` has one Latin word per Hebrew word, the option
 * that pronounces that way wins.
 */
export function assembleDicta(tokens, transliteration = "") {
  const list = Array.isArray(tokens) ? tokens : [];
  const words = list.filter((t) => t && !t.sep);
  const hints = String(transliteration || "").trim().split(/\s+/).filter(Boolean);
  const useHints = hints.length > 0 && hints.length === words.length;
  let wordIndex = 0;
  let out = "";
  for (const token of list) {
    if (!token) continue;
    if (token.sep) {
      out += token.word || "";
      continue;
    }
    const hint = useHints ? hints[wordIndex] : "";
    wordIndex += 1;
    const chosen = chooseNikudOption(token.options, hint, token.word);
    out += chosen && sameLetters(chosen, token.word || "") ? chosen : (token.word || "");
  }
  return out;
}

export function nikudCacheKey(text, transliteration) {
  return `${stripNikud(text).replace(/\s+/g, " ").trim()}\n${plainLatin(transliteration)}`;
}

function readCache(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    if (typeof localStorage === "undefined") return null;
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    if (all && typeof all[key] === "string") {
      memory.set(key, all[key]);
      return all[key];
    }
  } catch { /* ignore */ }
  return null;
}

function writeCache(key, value) {
  memory.set(key, value);
  try {
    if (typeof localStorage === "undefined") return;
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    const keys = Object.keys(all);
    if (keys.length > 400 && !all[key]) delete all[keys[0]];
    all[key] = value;
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

async function vocalizeWithModel(plain, transliteration) {
  const { base44 } = await import("@/api/base44Client");
  const hint = transliteration
    ? `The modern Israeli pronunciation is exactly: ${transliteration}. Point the words so they say that, not a different reading of the same letters.`
    : "Use the everyday Israeli reading of each word.";
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Add full modern Israeli nikud (vowel points only, no cantillation) to this Hebrew.
Do not add, remove, reorder, or translate any letters. Do not use Biblical or Ashkenazi pointing.
${hint}
Hebrew: ${plain}
Return JSON with "hebrew" set to the same text with nikud.`,
    response_json_schema: {
      type: "object",
      properties: { hebrew: { type: "string" } },
    },
  });
  return String(result?.hebrew || "");
}

/**
 * Return `text` with modern Israeli nikud. Cached. Never changes the letters.
 * `transliteration` disambiguates words like ספר (sefer / sapar).
 */
export async function vocalizeHebrew(text, transliteration = "") {
  const original = String(text || "");
  const plain = stripNikud(original);
  if (!hasHebrew(plain)) return original;
  const key = nikudCacheKey(plain, transliteration);
  const cached = readCache(key);
  if (cached) return cached;

  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    let pointed = "";
    if (hasNikud(original) && (!transliteration || matchesHint(original, transliteration) || plainLatin(transliteration).includes(plainLatin(displayTransliteration(original, ""))))) {
      pointed = original;
    }
    if (!pointed && typeof fetch === "function") {
      try {
        const res = await fetch("/api/hebrew/nikud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: plain, transliteration: transliteration || "" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.nikud && sameLetters(data.nikud, plain)) pointed = data.nikud;
        }
      } catch { /* Dicta or the route is down */ }
    }
    if (!pointed) {
      try {
        const llm = await vocalizeWithModel(plain, transliteration);
        if (llm && sameLetters(llm, plain)) pointed = llm;
      } catch { /* no model available */ }
    }
    if (!pointed) pointed = hasNikud(original) ? original : plain;
    writeCache(key, pointed);
    return pointed;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
