/**
 * Example sentences shown on mnemonic cards.
 *
 * A native-speaker prompt drafts a short everyday sentence, then a second fast
 * call verifies it (or replaces it) before anything is shown. Transliteration
 * and English always come from the verified sentence. Results are cached.
 *
 * Hebrew standard: modern spoken Israeli Hebrew. The כלב fixture is the
 * reference for a correct card: יש לי כלב שחור / yesh li kelev shachor /
 * I have a black dog.
 */

export const KELEV_EXAMPLE = {
  word: "כלב",
  phonetic: "kelev",
  translation: "dog",
  language: "hebrew",
  hebrew_sentence: "יש לי כלב שחור",
  transliteration: "yesh li kelev shachor",
  english: "I have a black dog",
};

export type SentenceInput = {
  word?: string;
  phonetic?: string;
  translation?: string;
  language?: string;
  /** Base form when the card word is inflected. The sentence may use either. */
  lemma?: string;
  lemmaPhonetic?: string;
  lemmaMeaning?: string;
};

export type SentenceWord = { hebrew: string; word: string; meaning: string };

export type CardSentence = {
  hebrew_sentence: string;
  transliteration: string;
  english: string;
  words: SentenceWord[];
  verified: true;
};

export class MnemonicSentenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MnemonicSentenceError";
  }
}

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const SENTENCE_SCHEMA = {
  type: "object",
  properties: {
    hebrew_sentence: { type: "string" },
    transliteration: { type: "string" },
    english: { type: "string" },
    words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          hebrew: { type: "string" },
          word: { type: "string" },
          meaning: { type: "string" },
        },
      },
    },
  },
};

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    hebrew_sentence: { type: "string" },
    transliteration: { type: "string" },
    english: { type: "string" },
    words: SENTENCE_SCHEMA.properties.words,
    reason: { type: "string" },
  },
};

export type SentenceInvoke = (args: { prompt: string; response_json_schema: object }) => Promise<unknown>;

function languageName(language?: string) {
  const value = clean(language).toLowerCase() || "hebrew";
  if (value === "iw" || value === "he") return "hebrew";
  return value;
}

function isHebrew(language?: string) {
  return languageName(language) === "hebrew";
}

export function exampleSentencePrompt(input: SentenceInput): string {
  const language = languageName(input.language);
  const hebrew = isHebrew(language);
  const label = hebrew ? "Israeli Hebrew" : language;
  const targetScript = clean(input.lemma) || clean(input.word);
  const targetPhonetic = clean(input.lemmaPhonetic) || clean(input.phonetic);
  const meaning = clean(input.lemmaMeaning) || clean(input.translation);
  const voice = hebrew
    ? `You are a native Israeli Hebrew speaker and a Hebrew teacher. Write the way people actually talk in Israel today: short, common, spoken-register Hebrew. Use correct gender and number agreement and natural Israeli word order. No Biblical Hebrew, no literary Hebrew, and no word order that is just English translated word for word.`
    : `You are a native ${label} speaker and a language teacher. Write one short sentence in today's everyday spoken ${label}. Use correct gender and number agreement and natural word order. No literary, archaic, or word-for-word translated phrasing.`;
  const example = hebrew
    ? `A correct card for כלב (kelev, dog) is exactly: Hebrew "יש לי כלב שחור", transliteration "yesh li kelev shachor", English "I have a black dog". "אני יש כלב" is wrong Hebrew and must never be returned.`
    : `Match the transliteration and the English to the sentence you actually wrote, the way "יש לי כלב שחור" matches "yesh li kelev shachor" and "I have a black dog".`;
  return `${voice}

${example}

TARGET: ${targetScript ? `${label} "${targetScript}"` : ""} pronunciation "${targetPhonetic}" meaning "${meaning}".
${clean(input.word) && clean(input.lemma) && clean(input.word) !== clean(input.lemma) ? `The learner's card shows the surface form "${clean(input.word)}" (${clean(input.phonetic)}). The sentence must use the base "${targetScript}" or a natural everyday inflection of it, not a pile of extra prefixes.` : ""}

Write ONE sentence of 4–7 words that a native speaker would say this week.
The ${label} sentence, its Latin transliteration, and the English must all express that same sentence. The English is a translation of the ${label} sentence, not a paraphrase of a different idea.
${hebrew ? "Use standard modern Israeli spelling without nikud." : `Use correct everyday ${label} spelling.`}
Every token in "words" is one word of the sentence, in order: hebrew = native spelling, word = its transliteration, meaning = its English meaning.

Return JSON: hebrew_sentence, transliteration, english, words.`;
}

export function verifySentencePrompt(draft: { hebrew_sentence?: string; transliteration?: string; english?: string }, input: SentenceInput): string {
  const language = languageName(input.language);
  const hebrew = isHebrew(language);
  const label = hebrew ? "modern spoken Israeli Hebrew" : `everyday spoken ${language}`;
  return `You are a native speaker reviewing one learner card before it is shown. The bar is ${label}: natural, common, correct gender and number, natural word order. Reject Biblical, literary, or literal-translation phrasing.

${hebrew ? `Reference of a GOOD Hebrew card: "יש לי כלב שחור" / "yesh li kelev shachor" / "I have a black dog" for כלב (dog). "אני יש כלב" is incorrect and must be replaced.` : ""}

Draft native sentence: ${clean(draft.hebrew_sentence)}
Draft transliteration: ${clean(draft.transliteration)}
Draft English: ${clean(draft.english)}
It must clearly use ${clean(input.lemma) || clean(input.word) || clean(input.lemmaPhonetic) || clean(input.phonetic)} (${clean(input.lemmaMeaning) || clean(input.translation)}).

If the draft is already something you would say, and the transliteration and English match THAT sentence, return ok true plus the same three strings (fix only spelling or transliteration if needed).
If it is unnatural or the transliteration/English do not match it, return ok false and a corrected hebrew_sentence, transliteration, and english that match each other. Do not leave the old transliteration or the old English attached to a new sentence.

Return JSON only: ok, hebrew_sentence, transliteration, english, words (native, transliteration, meaning for each word in order), reason.`;
}

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
      return {};
    }
  }
  return result as Record<string, unknown>;
}

function readWords(raw: unknown, hebrew: string, transliteration: string): SentenceWord[] {
  const list = Array.isArray(raw) ? raw : [];
  const words = list
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        hebrew: clean(row.hebrew),
        word: clean(row.word || row.transliteration),
        meaning: clean(row.meaning || row.english),
      };
    })
    .filter((row) => row.hebrew || row.word);
  if (words.length > 0) return words;
  const native = hebrew.split(/\s+/).filter(Boolean);
  const latin = transliteration.split(/\s+/).filter(Boolean);
  return native.map((tokenText, index) => ({
    hebrew: tokenText,
    word: latin[index] || "",
    meaning: "",
  }));
}

const fold = (value: unknown) =>
  clean(value)
    .toLowerCase()
    .replace(/['’\-]/g, "")
    .replace(/[^\w\u0590-\u05FF\u0600-\u06FF\s]/g, "");

export function sentenceIncludesTarget(hebrew: string, transliteration: string, input: SentenceInput): boolean {
  const blob = `${fold(hebrew)} ${fold(transliteration)}`;
  const targets = [input.word, input.phonetic, input.lemma, input.lemmaPhonetic].map(fold).filter((item) => item.length >= 2);
  return targets.some((target) => blob.includes(target));
}

export function sentenceCacheKey(input: SentenceInput): string {
  return [
    languageName(input.language),
    clean(input.word),
    clean(input.phonetic),
    clean(input.translation),
    clean(input.lemma),
    clean(input.lemmaPhonetic),
  ].join("|");
}

export function applyVerification(
  draftRaw: unknown,
  reviewRaw: unknown,
  input: SentenceInput,
): CardSentence {
  const draft = asObject(draftRaw);
  const review = asObject(reviewRaw);
  const rejected = review.ok === false || review.ok === "false";
  const hebrew = clean(rejected ? review.hebrew_sentence : review.hebrew_sentence || draft.hebrew_sentence);
  const transliteration = clean(review.transliteration || (!rejected ? draft.transliteration : ""));
  const english = clean(review.english || (!rejected ? draft.english : ""));
  if (!hebrew || !transliteration || !english) {
    throw new MnemonicSentenceError("The example sentence was not verified, so it was not shown.");
  }
  if (!sentenceIncludesTarget(hebrew, transliteration, input)) {
    const target = clean(input.lemma) || clean(input.word) || clean(input.phonetic) || "the word";
    throw new MnemonicSentenceError(`The verified sentence does not use ${target}, so it was not shown.`);
  }
  const words = readWords(rejected ? review.words : review.words || draft.words, hebrew, transliteration);
  return { hebrew_sentence: hebrew, transliteration, english, words, verified: true };
}

const memoryCache = new Map<string, CardSentence>();

function readCache(key: string, cache?: Map<string, CardSentence>): CardSentence | null {
  if (cache?.has(key)) return cache.get(key) || null;
  if (!cache && memoryCache.has(key)) return memoryCache.get(key) || null;
  if (typeof sessionStorage !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`mnemonic-sentence:${key}`);
      if (stored) {
        const parsed = JSON.parse(stored) as CardSentence;
        if (parsed?.verified && parsed.hebrew_sentence && parsed.transliteration && parsed.english) {
          (cache || memoryCache).set(key, parsed);
          return parsed;
        }
      }
    } catch {
      /* ignore broken cache entries */
    }
  }
  return null;
}

function writeCache(key: string, sentence: CardSentence, cache?: Map<string, CardSentence>) {
  (cache || memoryCache).set(key, sentence);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`mnemonic-sentence:${key}`, JSON.stringify(sentence));
    } catch {
      /* quota or private mode */
    }
  }
}

/**
 * Draft, then verify, then return. Callers can start this in parallel with
 * image generation; nothing is returned until the review agrees the
 * transliteration and English belong to the sentence that will be shown.
 */
export async function generateVerifiedExampleSentence(
  input: SentenceInput,
  invoke: SentenceInvoke,
  cache?: Map<string, CardSentence>,
): Promise<CardSentence> {
  const key = sentenceCacheKey(input);
  const cached = readCache(key, cache);
  if (cached) return cached;

  let draft: unknown;
  try {
    draft = await invoke({ prompt: exampleSentencePrompt(input), response_json_schema: SENTENCE_SCHEMA });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The sentence draft failed.";
    throw new MnemonicSentenceError(message);
  }

  let review: unknown;
  try {
    const draftObject = asObject(draft);
    review = await invoke({
      prompt: verifySentencePrompt(draftObject, input),
      response_json_schema: REVIEW_SCHEMA,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The sentence check failed.";
    throw new MnemonicSentenceError(`Example sentence was not verified. ${message}`);
  }

  const sentence = applyVerification(draft, review, input);
  writeCache(key, sentence, cache);
  return sentence;
}
