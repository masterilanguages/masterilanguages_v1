import test from "node:test";
import assert from "node:assert/strict";
import {
  HEBREW_TRANSLIT_RULES,
  QUALITY_MODEL,
  transliterateHebrewSync,
  displayTransliteration,
  polishHebrewPayload,
  prepareHebrewLlmArgs,
  isHebrewTranslitPrompt,
} from "./romanize.js";

const vocalized = [
  ["שָׁלוֹם", "shalom"],
  ["תּוֹדָה", "toda"],
  ["בְּבַקָּשָׁה", "bevakasha"],
  ["חָלָב", "chalav"],
  ["כֶּלֶב", "kelev"],
  ["לֶחֶם", "lechem"],
  ["מַיִם", "mayim"],
  ["בֵּיצָה", "beitza"],
  ["קָפֶה", "kafe"],
  ["תֵּה", "te"],
  ["עֵינַיִם", "einayim"],
  ["רָעֵב", "raev"],
  ["מִשְׂחָק", "mischak"],
  ["לִצְחֹק", "litzchok"],
  ["מָרְץ", "martz"],
  ["צָהֹב", "tzahov"],
  ["אֲנִי", "ani"],
  ["בּוֹקֶר", "boker"],
  ["לַיְלָה", "layla"],
  ["שַׁבָּת", "shabbat"],
  ["בָּרוּךְ", "baruch"],
  ["תּוֹרָה", "tora"],
  ["אֵין", "ein"],
  ["בַּיִת", "bayit"],
  ["יֵשׁ", "yesh"],
  ["כֵּן", "ken"],
  ["לֹא", "lo"],
  ["מָה", "ma"],
  ["סֵפֶר", "sefer"],
  ["חָבֵר", "chaver"],
  ["כּוֹכָבִים", "kochavim"],
  ["פָּנִים", "panim"],
  ["מַגְלֵשָׁה", "maglesha"],
  ["גְּבִינָה", "gvina"],
  ["שְׂמִיכָה", "smicha"],
  ["אַמְבַּטְיָה", "ambatya"],
  ["לְדַבֵּר", "ledaber"],
  ["תְּדַבֵּר", "tedaber"],
  ["אֲדַבֵּר", "adaber"],
  ["יְדַבֵּר", "yedaber"],
  ["נְדַבֵּר", "nedaber"],
  ["אֵלֵךְ", "elech"],
  ["תֵּלְכִי", "telchi"],
  ["תֵּלְכוּ", "telchu"],
  ["יֵלְכוּ", "yelchu"],
  ["תַּחְשְׁבִי", "tachshevi"],
  ["אַחְשׁוֹב", "achshov"],
  ["אֶבְחַר", "evchar"],
  ["תִּבְחֲרִי", "tivchari"],
  ["בְּרָכָה", "bracha"],
  ["כְּלָבִים", "klavim"],
  ["פְּרִי", "pri"],
  ["בְּלִי", "bli"],
  ["הִיא", "hi"],
  ["הוּא", "hu"],
  ["רוּחַ", "ruach"],
  ["שׁוֹמֵעַ", "shomea"],
  ["פּוֹתֵחַ", "poteach"],
  ["אֶרְאֶה", "ere"],
  ["תִּרְאֶה", "tire"],
  ["לוֹמַר", "lomar"],
  ["אֹמַר", "omar"],
  ["תֹּאמְרִי", "tomri"],
];

test("pointed Hebrew follows modern Israeli pronunciation", () => {
  for (const [hebrew, latin] of vocalized) {
    const got = transliterateHebrewSync(hebrew);
    assert.equal(got.confident, true, hebrew);
    assert.equal(got.text, latin, `${hebrew} → ${got.text}, expected ${latin}`);
  }
});

test("platform examples are reproduced exactly", () => {
  assert.equal(QUALITY_MODEL, "claude-opus-5-5");
  assert.match(HEBREW_TRANSLIT_RULES, /no hyphens or apostrophes/);
  const phrases = [
    ["נכנסת לחיי", "nichnast lechayai"],
    ["לפני שוויתרתי", "lifnei shevitarti"],
    ["הערת את הלב בים של צבעים", "heart et halev beyam shel tzvaim"],
    ["בן אדם, מה לך נרדם", "ben adam, ma lecha nirdam"],
  ];
  for (const [hebrew, latin] of phrases) {
    assert.equal(transliterateHebrewSync(hebrew).text, latin);
    assert.ok(HEBREW_TRANSLIT_RULES.includes(`${hebrew} = ${latin}`));
  }
});

test("stored lesson spellings are corrected to the standard", () => {
  const fixes = [
    ["ביצה", "Beitzah", "Beitza"],
    ["גבינה", "Gvinah", "Gvina"],
    ["תה", "Teh", "Te"],
    ["קפה", "Kafeh", "Kafe"],
    ["עוגה", "Ugah", "Uga"],
    ["מיטה", "Mitah", "Mita"],
    ["שמיכה", "Smichah", "Smicha"],
    ["אמבטיה", "Ambatyah", "Ambatya"],
    ["משחק", "Misachak", "Mischak"],
    ["לצחוק", "Litschok", "Litzchok"],
    ["מגלשה", "Maglasha", "Maglesha"],
    ["פנים", "Pnim", "Panim"],
    ["מרץ", "merts", "martz"],
    ["צהוב", "tsahov", "tzahov"],
    ["דצמבר", "detsember", "detzember"],
    ["חזה", "chazeh", "chaze"],
    ["רעב", "Ra'ev", "Raev"],
    ["שעון", "Sha'on", "Shaon"],
    ["שבת", "shabbos", "shabbat"],
    ["ברוך", "boruch", "baruch"],
    ["תורה", "toyrah", "tora"],
    ["תֵּלְכִי", "Tel-ch-i", "Telchi"],
    ["תְּדַבֵּר", "T-daber", "Tedaber"],
    ["אני רוצה לשתות", "Ani rotzeh lishtot", "Ani rotze lishtot"],
  ];
  for (const [hebrew, before, after] of fixes) {
    assert.equal(displayTransliteration(hebrew, before), after, `${hebrew}: ${before}`);
  }
});

test("unvocalized sentences are not guessed letter by letter", () => {
  const unknown = transliterateHebrewSync("הוא ספר סיפור ארוך אתמול");
  assert.equal(unknown.confident, false);
  assert.equal(displayTransliteration("הוא ספר סיפור ארוך אתמול", "hu sipur sipur aroch etmol"), "hu sipur sipur aroch etmol");
});

test("first unconfident reading stays stable", () => {
  const hebrew = "מילהחדשהלגמרי";
  const first = polishHebrewPayload({ hebrew, transliteration: "bedikha" });
  const second = polishHebrewPayload({ hebrew, transliteration: "somethingelse" });
  assert.equal(first.transliteration, "bedicha");
  assert.equal(second.transliteration, "bedicha");
});

test("Hebrew transliteration prompts use the platform quality model and rules", () => {
  const spanish = prepareHebrewLlmArgs({
    prompt: "Give a phonetic Latin spelling of the Spanish word gato.",
  });
  assert.equal(spanish.model, undefined);
  assert.equal(isHebrewTranslitPrompt(spanish.prompt), false);

  const hebrew = prepareHebrewLlmArgs({
    prompt: "Provide the transliteration of the Hebrew word ביצה.",
  });
  assert.equal(hebrew.model, QUALITY_MODEL);
  assert.match(hebrew.prompt, /nichnast lechayai/);
  assert.equal(prepareHebrewLlmArgs({ prompt: hebrew.prompt, model: "claude-haiku-4-5" }).model, "claude-haiku-4-5");
});

test("payload polish rewrites transliteration fields and leaves English", () => {
  const polished = polishHebrewPayload({
    hebrew: "ביצה",
    transliteration: "Beitzah",
    english: "egg",
    example_sentence_hebrew: "אני רוצה ביצה",
    example_sentence_transliteration: "ani rotzeh beitzah",
  });
  assert.equal(polished.transliteration, "Beitza");
  assert.equal(polished.english, "egg");
});
