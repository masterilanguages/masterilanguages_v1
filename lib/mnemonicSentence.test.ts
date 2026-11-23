import test from "node:test";
import assert from "node:assert/strict";
import {
  KELEV_EXAMPLE,
  applyVerification,
  exampleSentencePrompt,
  generateVerifiedExampleSentence,
  sentenceIncludesTarget,
} from "./mnemonicSentence.ts";

const kelev = {
  word: KELEV_EXAMPLE.word,
  phonetic: KELEV_EXAMPLE.phonetic,
  translation: KELEV_EXAMPLE.translation,
  language: KELEV_EXAMPLE.language,
};

test("the Hebrew prompt is a native Israeli speaker and includes the kelev card", () => {
  const prompt = exampleSentencePrompt(kelev);
  assert.match(prompt, /native Israeli Hebrew speaker/);
  assert.match(prompt, /spoken-register/);
  assert.match(prompt, /gender and number/);
  assert.match(prompt, /No Biblical Hebrew/);
  assert.match(prompt, new RegExp(KELEV_EXAMPLE.hebrew_sentence));
  assert.match(prompt, new RegExp(KELEV_EXAMPLE.transliteration));
  assert.match(prompt, new RegExp(KELEV_EXAMPLE.english));
  assert.match(prompt, /אני יש כלב/);
});

test("a bad kelev draft is replaced by the verified sentence and its matching transliteration", () => {
  const verified = applyVerification(
    {
      hebrew_sentence: "אני יש כלב",
      transliteration: "ani yesh kelev",
      english: "I am have dog",
      words: [],
    },
    {
      ok: false,
      reason: "word order is not Israeli Hebrew",
      hebrew_sentence: KELEV_EXAMPLE.hebrew_sentence,
      transliteration: KELEV_EXAMPLE.transliteration,
      english: KELEV_EXAMPLE.english,
      words: [
        { hebrew: "יש", word: "yesh", meaning: "there is" },
        { hebrew: "לי", word: "li", meaning: "to me" },
        { hebrew: "כלב", word: "kelev", meaning: "dog" },
        { hebrew: "שחור", word: "shachor", meaning: "black" },
      ],
    },
    kelev,
  );
  assert.equal(verified.hebrew_sentence, KELEV_EXAMPLE.hebrew_sentence);
  assert.equal(verified.transliteration, KELEV_EXAMPLE.transliteration);
  assert.equal(verified.english, KELEV_EXAMPLE.english);
  assert.equal(verified.verified, true);
  assert.equal(verified.words[2].word, "kelev");
  assert.equal(sentenceIncludesTarget(verified.hebrew_sentence, verified.transliteration, kelev), true);
});

test("an approved draft still takes the reviewer's transliteration and English", () => {
  const verified = applyVerification(
    {
      hebrew_sentence: KELEV_EXAMPLE.hebrew_sentence,
      transliteration: "yesh li KELEV shahor",
      english: "I have dog black",
    },
    {
      ok: true,
      hebrew_sentence: KELEV_EXAMPLE.hebrew_sentence,
      transliteration: KELEV_EXAMPLE.transliteration,
      english: KELEV_EXAMPLE.english,
    },
    kelev,
  );
  assert.equal(verified.transliteration, KELEV_EXAMPLE.transliteration);
  assert.equal(verified.english, KELEV_EXAMPLE.english);
});

test("generation verifies before returning and then serves the cache", async () => {
  const cache = new Map();
  let calls = 0;
  const invoke = async ({ prompt }: { prompt: string }) => {
    calls += 1;
    if (calls === 1) {
      assert.match(prompt, /יש לי כלב שחור/);
      return {
        hebrew_sentence: "אני יש כלב",
        transliteration: "ani yesh kelev",
        english: "I am have dog",
      };
    }
    assert.match(prompt, /native speaker reviewing/);
    return {
      ok: false,
      hebrew_sentence: KELEV_EXAMPLE.hebrew_sentence,
      transliteration: KELEV_EXAMPLE.transliteration,
      english: KELEV_EXAMPLE.english,
    };
  };
  const first = await generateVerifiedExampleSentence(kelev, invoke, cache);
  assert.equal(first.english, KELEV_EXAMPLE.english);
  assert.equal(calls, 2);
  const second = await generateVerifiedExampleSentence(kelev, invoke, cache);
  assert.equal(second.hebrew_sentence, first.hebrew_sentence);
  assert.equal(calls, 2);
});

test("a failed review is not shown", async () => {
  await assert.rejects(
    () => generateVerifiedExampleSentence(kelev, async ({ prompt }) => {
      if (prompt.includes("reviewing")) throw new Error("reviewer timeout");
      return { hebrew_sentence: "אני יש כלב", transliteration: "ani yesh kelev", english: "I am have dog" };
    }, new Map()),
    /not verified/,
  );
});

test("other languages ask for a native everyday sentence rather than Israeli Hebrew", () => {
  const prompt = exampleSentencePrompt({ word: "perro", phonetic: "perro", translation: "dog", language: "spanish" });
  assert.match(prompt, /native spanish speaker/);
  assert.match(prompt, /everyday spoken spanish/);
  assert.doesNotMatch(prompt, /Biblical Hebrew/);
});
