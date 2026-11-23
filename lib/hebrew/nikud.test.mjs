import test from "node:test";
import assert from "node:assert/strict";
import {
  stripNikud,
  hasNikud,
  sameLetters,
  assembleDicta,
  chooseNikudOption,
} from "./nikud.js";

test("stripNikud removes U+0591 through U+05C7 and keeps letters", () => {
  assert.equal(stripNikud("שָׁלוֹם"), "שלום");
  assert.equal(stripNikud("בֵּיצָה"), "ביצה");
  assert.equal(stripNikud("אֲנִי"), "אני");
  assert.equal(hasNikud("שָׁלוֹם"), true);
  assert.equal(hasNikud("שלום"), false);
  const cantillation = "ש\u0591לום";
  const kamatzKatan = "כ\u05C7ל";
  assert.equal(stripNikud(cantillation), "שלום");
  assert.equal(stripNikud(kamatzKatan), "כל");
  assert.equal(stripNikud("פיג'מה"), "פיג'מה");
});

test("Dicta options keep the letters and prefer the transliteration", () => {
  const line = assembleDicta([
    { word: "אני", sep: false, options: ["אֲנִי"] },
    { word: " ", sep: true },
    { word: "רוצה", sep: false, options: ["רוֹצֶה"] },
    { word: " ", sep: true },
    { word: "ביצה", sep: false, options: ["בֵּיצָה"] },
    { word: ".", sep: true },
  ]);
  assert.equal(line, "אֲנִי רוֹצֶה בֵּיצָה.");
  assert.equal(sameLetters(line, "אני רוצה ביצה."), true);

  const sefer = "סֵפֶר";
  const sapar = "סַפָּר";
  assert.equal(chooseNikudOption([sefer, sapar], "sapar"), sapar);
  assert.equal(chooseNikudOption([sefer, sapar], "sefer"), sefer);
  assert.equal(chooseNikudOption([sefer, sapar], ""), sefer);
  assert.equal(
    chooseNikudOption(["לִצְחֹק", "לִצְחוֹק"], "litzchok", "לצחוק"),
    "לִצְחוֹק"
  );
});

test("a mismatched hint does not change letters", () => {
  const pointed = assembleDicta(
    [{ word: "ספר", sep: false, options: ["סֵפֶר", "סַפָּר"] }],
    "totally-different"
  );
  assert.equal(sameLetters(pointed, "ספר"), true);
  assert.equal(stripNikud(pointed), "ספר");
});
