import test from "node:test";
import assert from "node:assert/strict";
import {
  embedLemma,
  lemmaLabel,
  lemmaPrompt,
  readEmbeddedLemma,
  resolveMnemonicLemma,
  soundMnemonicPrompt,
  suspectsInflection,
  stripLemmaMarker,
  wordNeedsMnemonic,
} from "./mnemonicLemma.ts";

test("Hebrew בבית is lemmatized to בית / bayit and the sound prompt uses the base", async () => {
  const input = { word: "בבית", phonetic: "ba'bayit", translation: "in the house", language: "hebrew" };
  assert.equal(suspectsInflection(input), true);
  const basis = await resolveMnemonicLemma(input, async () => ({
    lemma: "בית",
    lemma_phonetic: "bayit",
    lemma_meaning: "house",
    changed: true,
    note: "dropped the ב preposition",
  }));
  assert.equal(basis.lemma, "בית");
  assert.equal(basis.lemmaPhonetic, "bayit");
  assert.equal(basis.lemmaMeaning, "house");
  const prompt = soundMnemonicPrompt(basis, "Hebrew");
  assert.match(prompt, /bayit/);
  assert.match(prompt, /house/);
  assert.doesNotMatch(prompt, /sounds like "babait"/);
  assert.doesNotMatch(prompt, /sounds like "ba'bayit"/);
  assert.equal(lemmaLabel(basis, "בבית", "ba'bayit"), "בית · bayit");
});

test("a failed lemmatizer does not chop the first letter off an inflected word", async () => {
  const input = { word: "בבית", phonetic: "babait", translation: "in the house", language: "hebrew" };
  await assert.rejects(
    () => resolveMnemonicLemma(input, async () => { throw new Error("llm down"); }, new Map()),
    /base form of בבית/,
  );
});

test("an already-base word is kept when the lemmatizer is down", async () => {
  const basis = await resolveMnemonicLemma(
    { word: "בית", phonetic: "bayit", translation: "house", language: "hebrew" },
    async () => { throw new Error("llm down"); },
    new Map(),
  );
  assert.equal(basis.lemma, "בית");
  assert.equal(basis.lemmaPhonetic, "bayit");
  assert.equal(basis.changed, false);
  assert.equal(lemmaLabel(basis, "בית", "bayit"), null);
});

test("the lemma prompt forbids naive prefix chopping and gives the house example", () => {
  const prompt = lemmaPrompt({ word: "בבית", phonetic: "ba'bayit", translation: "in the house", language: "hebrew" });
  assert.match(prompt, /בבית/);
  assert.match(prompt, /bayit/);
  assert.match(prompt, /Never delete a letter that belongs to the root/);
  assert.match(prompt, /ללכת stays ללכת/);
});

test("embedded lemma round-trips and does not replace the visible sentence", () => {
  const marked = embedLemma("A BITE of bread on a little house", {
    lemma: "בית",
    lemmaPhonetic: "bayit",
    lemmaMeaning: "house",
    changed: true,
    note: "",
  });
  assert.equal(readEmbeddedLemma(marked)?.lemmaPhonetic, "bayit");
  assert.equal(stripLemmaMarker(marked), "A BITE of bread on a little house");
});

test("romance and arabic clitics are flagged without being rewritten here", () => {
  assert.equal(suspectsInflection({ word: "del perro", phonetic: "del perro", translation: "of the dog", language: "spanish" }), true);
  assert.equal(suspectsInflection({ word: "perro", phonetic: "perro", translation: "dog", language: "spanish" }), false);
  assert.equal(suspectsInflection({ word: "l'eau", phonetic: "lo", translation: "the water", language: "french" }), true);
  assert.equal(suspectsInflection({ word: "البيت", phonetic: "al-bayt", translation: "the house", language: "arabic" }), true);
  assert.equal(suspectsInflection({ word: "das Haus", phonetic: "das haus", translation: "the house", language: "german" }), true);
});

test("existing inflected cards without a lemma are rebuilt; base cards with images are not", () => {
  assert.equal(wordNeedsMnemonic({ id: "1", word: "בבית", phonetic: "babait", translation: "in the house", language: "hebrew", image_url: "https://cdn/x.png" }), true);
  assert.equal(wordNeedsMnemonic({ id: "2", word: "בית", phonetic: "bayit", translation: "house", language: "hebrew", image_url: "https://cdn/x.png" }), false);
  assert.equal(wordNeedsMnemonic({ id: "3", word: "בית", phonetic: "bayit", translation: "house", language: "hebrew" }), true);
  assert.equal(wordNeedsMnemonic({ id: "session_0", word: "בית", phonetic: "bayit", translation: "house" }), false);
});
