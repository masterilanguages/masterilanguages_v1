/**
 * Lemma used for mnemonic images and sound keywords.
 *
 * The sound and the picture are built from the dictionary base (בית / bayit),
 * never from a naive slice of a prefix (בבית must not become "babait" or "abait").
 * Resolution is an AI call with the gloss as context. This module never deletes
 * a leading letter itself.
 *
 * `word.lemma_key` is the Hebrew verb-infinitive key in Backpack. Do not reuse
 * it. Persist the mnemonic base as mnemonic_lemma* when those columns exist,
 * and always embed [[lemma:script|phonetic|meaning]] in mnemonic_explanation
 * so the card can show the base after reload.
 */

export type LemmaInput = {
  word?: string;
  phonetic?: string;
  translation?: string;
  language?: string;
};

export type MnemonicLemma = {
  lemma: string;
  lemmaPhonetic: string;
  lemmaMeaning: string;
  changed: boolean;
  note: string;
};

export class MnemonicLemmaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MnemonicLemmaError";
  }
}

const MARK = /\[\[lemma:([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]\s*/;

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const norm = (value: unknown) =>
  clean(value)
    .toLowerCase()
    .replace(/['’\-]/g, "")
    .replace(/\s+/g, "");

function token(value: unknown) {
  return clean(value).replace(/[\[\]|]/g, "");
}

export function embedLemma(explanation: string, lemma: MnemonicLemma): string {
  const body = stripLemmaMarker(explanation);
  return `[[lemma:${token(lemma.lemma)}|${token(lemma.lemmaPhonetic)}|${token(lemma.lemmaMeaning)}]] ${body}`.trim();
}

export function stripLemmaMarker(text: unknown): string {
  return clean(text).replace(MARK, "").trim();
}

export function readEmbeddedLemma(text: unknown): MnemonicLemma | null {
  const match = MARK.exec(clean(text));
  if (!match) return null;
  const lemma = match[1].trim();
  const lemmaPhonetic = match[2].trim();
  const lemmaMeaning = match[3].trim();
  if (!lemma && !lemmaPhonetic) return null;
  return {
    lemma: lemma || lemmaPhonetic,
    lemmaPhonetic: lemmaPhonetic || lemma,
    lemmaMeaning,
    changed: true,
    note: "",
  };
}

export function lemmaFromWord(word: LemmaInput & { mnemonic_lemma?: string; mnemonic_lemma_phonetic?: string; mnemonic_lemma_meaning?: string; mnemonic_explanation?: string }, explanationText?: string): MnemonicLemma | null {
  if (clean(word?.mnemonic_lemma) || clean(word?.mnemonic_lemma_phonetic)) {
    return {
      lemma: clean(word.mnemonic_lemma) || clean(word.mnemonic_lemma_phonetic),
      lemmaPhonetic: clean(word.mnemonic_lemma_phonetic) || clean(word.mnemonic_lemma),
      lemmaMeaning: clean(word.mnemonic_lemma_meaning || word.translation),
      changed: true,
      note: "",
    };
  }
  return readEmbeddedLemma(explanationText || word?.mnemonic_explanation);
}

/** Label for the card. Hidden when the base is the same form the card already shows. */
export function lemmaLabel(lemma: MnemonicLemma | null, surfaceWord?: string, surfacePhonetic?: string): string | null {
  if (!lemma) return null;
  const sameScript = norm(lemma.lemma) === norm(surfaceWord) || norm(lemma.lemma) === norm(surfacePhonetic);
  const samePhonetic = norm(lemma.lemmaPhonetic) === norm(surfacePhonetic) || norm(lemma.lemmaPhonetic) === norm(surfaceWord);
  if (sameScript && samePhonetic) return null;
  if (lemma.lemma && norm(lemma.lemma) !== norm(lemma.lemmaPhonetic)) {
    return `${lemma.lemma} · ${lemma.lemmaPhonetic}`;
  }
  return lemma.lemmaPhonetic || lemma.lemma;
}

/**
 * Hint only — used to decide whether a failed lemmatizer may fall back to the
 * surface form, and whether an existing card should be rebuilt. It does not
 * return a stripped string.
 */
export function suspectsInflection(input: LemmaInput): boolean {
  const language = clean(input.language).toLowerCase() || "hebrew";
  const script = clean(input.word);
  const phonetic = clean(input.phonetic);
  const gloss = clean(input.translation);
  const glossCue = /^(in|in the|at|at the|to|to the|from|from the|as|like|and|the|that|of|of the|for|for the)\b/i.test(gloss);
  if (language === "hebrew" || language === "iw" || /[\u0590-\u05FF]/.test(script)) {
    const prefixLetter = /^[בלכמהוש]/.test(script) && Array.from(script).length >= 3;
    const phoneticPrefix = /^(ba|be|bi|la|le|li|ka|ke|ki|me|mi|ha|ve|va|she)/i.test(phonetic.replace(/['’]/g, ""));
    if ((prefixLetter || phoneticPrefix) && glossCue) return true;
  }
  const surface = `${script} ${phonetic}`.trim();
  if (/^(del|al|de la|de los|de las|el|la|los|las|un|una|le|les|des|du|au|aux)\s+/i.test(surface)) return true;
  if (/(?:^|\s)(l'|d'|l’|d’)/i.test(surface)) return true;
  if (/^(der|die|das|dem|den|ein|eine|einen)\s+/i.test(surface)) return true;
  if (/^ال/.test(script) || /^(al-|wa-|bi-|li-|ka-)/i.test(phonetic)) return true;
  return false;
}

export function wordNeedsMnemonic(word: LemmaInput & { id?: string; image_url?: string; mnemonic_explanation?: string; mnemonic_lemma?: string }): boolean {
  if (word?.id == null || String(word.id).startsWith("session_")) return false;
  const hasLemma = Boolean(clean(word.mnemonic_lemma)) || Boolean(readEmbeddedLemma(word.mnemonic_explanation));
  if (!word.image_url) return true;
  return !hasLemma && suspectsInflection(word);
}

export function mnemonicSaveFields(basis: MnemonicLemma, explanation: string, imageUrl?: string) {
  const data: Record<string, string> = {
    mnemonic_explanation: embedLemma(explanation, basis),
    mnemonic_lemma: basis.lemma,
    mnemonic_lemma_phonetic: basis.lemmaPhonetic,
    mnemonic_lemma_meaning: basis.lemmaMeaning,
  };
  if (imageUrl) data.image_url = imageUrl;
  return data;
}

export function lemmaPrompt(input: LemmaInput): string {
  const language = clean(input.language) || "hebrew";
  return `You lemmatize one vocabulary item so a mnemonic can be built from its dictionary base, not from attached grammar.

Language: ${language}
Surface word (native script): ${clean(input.word) || "(none)"}
Surface transliteration: ${clean(input.phonetic) || "(none)"}
English gloss: ${clean(input.translation) || "(none)"}

Return the dictionary lemma.
- Hebrew: remove attached prefixes ב בְּ ל לִ כ מ ה ו ש (be/ba, le/la, ke/ka, mi/me, ha, ve, she) only when they are clitics. Never delete a letter that belongs to the root. בבית / ba'bayit / "in the house" → lemma בית, lemma_phonetic bayit, lemma_meaning house. The infinitive ללכת stays ללכת; do not chop off its first letter.
- Spanish, French, Italian, Portuguese: drop articles and contractions (el, la, los, las, un, del, al, l', d', le, du, au, aux) and use the singular or the infinitive when the gloss is a plural or a conjugated verb.
- Arabic: drop clitic al-, wa-, bi-, li-, ka- only when they are attached function words.
- German: drop articles (der, die, das, dem, den, ein) and use the infinitive or singular when that is the dictionary form.
- If the word is already the base, return it unchanged.

Return JSON:
- lemma: base form in native script
- lemma_phonetic: Latin pronunciation of the base, without the stripped clitic
- lemma_meaning: English meaning of the base, without the preposition or article
- changed: true when the base differs from the surface form
- note: what was removed, or "already a base form"`;
}

const LEMMA_SCHEMA = {
  type: "object",
  properties: {
    lemma: { type: "string" },
    lemma_phonetic: { type: "string" },
    lemma_meaning: { type: "string" },
    changed: { type: "boolean" },
    note: { type: "string" },
  },
};

function asObject(result: unknown): Record<string, unknown> {
  if (!result) return {};
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }
  if (typeof result === "object" && result && "response" in result && typeof (result as { response?: unknown }).response === "string") {
    try {
      return JSON.parse((result as { response: string }).response);
    } catch {
      return result as Record<string, unknown>;
    }
  }
  return result as Record<string, unknown>;
}

function parseLemma(raw: unknown, input: LemmaInput): MnemonicLemma | null {
  const data = asObject(raw);
  const lemma = token(data.lemma);
  const lemmaPhonetic = token(data.lemma_phonetic || data.lemmaPhonetic);
  const lemmaMeaning = token(data.lemma_meaning || data.lemmaMeaning) || clean(input.translation);
  if (!lemma && !lemmaPhonetic) return null;
  const surfaceScript = clean(input.word);
  const surfacePhonetic = clean(input.phonetic);
  const changedFlag = data.changed === true || data.changed === "true";
  const changed =
    changedFlag ||
    (Boolean(lemma) && norm(lemma) !== norm(surfaceScript) && norm(lemma) !== norm(surfacePhonetic)) ||
    (Boolean(lemmaPhonetic) && norm(lemmaPhonetic) !== norm(surfacePhonetic) && norm(lemmaPhonetic) !== norm(surfaceScript));
  return {
    lemma: lemma || lemmaPhonetic,
    lemmaPhonetic: lemmaPhonetic || lemma,
    lemmaMeaning,
    changed,
    note: clean(data.note),
  };
}

export type LemmaInvoke = (args: { prompt: string; response_json_schema: typeof LEMMA_SCHEMA }) => Promise<unknown>;

const lemmaCache = new Map<string, MnemonicLemma>();
const lemmaInflight = new Map<string, Promise<MnemonicLemma>>();

export function lemmaCacheKey(input: LemmaInput): string {
  return [clean(input.language).toLowerCase() || "hebrew", clean(input.word), clean(input.phonetic), clean(input.translation)].join("|");
}

export async function resolveMnemonicLemma(
  input: LemmaInput,
  invoke: LemmaInvoke,
  cache: Map<string, MnemonicLemma> = lemmaCache,
): Promise<MnemonicLemma> {
  const key = lemmaCacheKey(input);
  const cached = cache.get(key);
  if (cached) return cached;
  if (cache === lemmaCache) {
    const pending = lemmaInflight.get(key);
    if (pending) return pending;
  }

  const run = async (): Promise<MnemonicLemma> => {
  const surface = (): MnemonicLemma => ({
    lemma: clean(input.word) || clean(input.phonetic),
    lemmaPhonetic: clean(input.phonetic) || clean(input.word),
    lemmaMeaning: clean(input.translation),
    changed: false,
    note: "already a base form",
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await invoke({ prompt: lemmaPrompt(input), response_json_schema: LEMMA_SCHEMA });
      const parsed = parseLemma(raw, input);
      if (parsed) {
        cache.set(key, parsed);
        return parsed;
      }
      lastError = new MnemonicLemmaError("The lemmatizer returned an empty base form.");
    } catch (error) {
      lastError = error;
    }
  }

  if (!suspectsInflection(input)) {
    const fallback = surface();
    cache.set(key, fallback);
    return fallback;
  }

  const shown = clean(input.word) || clean(input.phonetic) || "this word";
  throw new MnemonicLemmaError(
    `Couldn't find the base form of ${shown} (${clean(input.translation) || "unknown meaning"}). The mnemonic was not built from a prefix. ${errorText(lastError)}`.trim(),
  );
  };

  const promise = run();
  if (cache === lemmaCache) lemmaInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    if (cache === lemmaCache) lemmaInflight.delete(key);
  }
}

function errorText(error: unknown) {
  if (!error) return "";
  const message = error instanceof Error ? error.message : String(error);
  return message ? `Details: ${message}` : "";
}

export function soundMnemonicPrompt(basis: MnemonicLemma, languageName: string): string {
  const target = basis.lemmaPhonetic || basis.lemma;
  const meaning = basis.lemmaMeaning;
  return `You create sound-based visual mnemonics for language learning.

The mnemonic is for the BASE form only.
Base word: "${target}" (${basis.lemma}) in ${languageName}, meaning "${meaning}".
${basis.changed ? `The card also shows an inflected surface form. Ignore that surface form. Do not build the sound or the picture from any prefix, article, or ending that was removed to reach "${target}".` : ""}

STEP 1 — SOUND MATCH: Find a real, common English noun whose sound is like "${target}" or its first 1-2 syllables. It must be a physical everyday object or creature. Do not use color words as the sound anchor.

STEP 2 — SCENE: Put that object in a funny modern scene whose obvious focus is the meaning "${meaning}". The sound-anchor object is only a prop. No historical, violent, or military setting. Describe only what happens, not an art style.

STEP 3 — No speech bubbles, no text, no characters speaking. Do not name any character with the target word or the sound-anchor word.

Return JSON:
- sound_anchor: the English noun that sounds like "${target}"
- explanation: one punchy sentence like "An ESKIMO (askeem) shaking hands"
- image_prompt: the scene and action only, with "${meaning}" as the centerpiece`;
}

export function sceneForBaseWord(scene: string, basis: MnemonicLemma, surface?: string): string {
  return `A scene for the base word "${basis.lemmaPhonetic}" (${basis.lemma}), meaning "${basis.lemmaMeaning}". ${
    surface && basis.changed ? `The card's surface form is "${surface}" and is not the sound being illustrated.` : ""
  } Scene: ${clean(scene)}`;
}
