// Modern Israeli Hebrew romanization for Masteri.
//
// This is the same standard backpack-saas publishes in lib/chapterPrompts.ts
// (HEBREW_TRANSLIT_RULES + QUALITY_MODEL). Keep the two copies in sync.
// The platform measured Haiku and Sonnet mis-reading unvocalized Hebrew;
// claude-opus-5-5 is the model that gets grammatical vowels right.
//
// Style (Mark's lyric style): "ch" for ח and for כ/ך without dagesh, "k" for
// כּ, "tz" for צ/ץ, "sh" for שׁ (שׂ is "s"), ת and ט are "t", ע and א are
// silent, final ה is silent, one Latin word per Hebrew word, prefixes joined,
// no hyphens and no apostrophes. Spoken Israeli vowels, not Ashkenazi
// (no "shabbos", "boruch", "toyrah") and not Biblical ("th", "aw", "oy").

export const QUALITY_MODEL = "claude-opus-5-5";

export const HEBREW_TRANSLIT_RULES = `Transliterate Hebrew exactly as it is pronounced in modern Israeli Hebrew (for song lyrics, as it is sung), in a simple everyday style: "ch" for ח and for כ without dagesh, "tz" for צ, "sh" for ש, every vowel that is actually spoken, and no hyphens or apostrophes. Work out each word's grammatical form from the context (person, gender, tense) before transliterating it, and use its real pronunciation, never a letter-by-letter guess. Keep one Latin word per Hebrew word, with a one-letter prefix (ו ה ב כ ל מ ש) joined to its word. Examples: נכנסת לחיי = nichnast lechayai; לפני שוויתרתי = lifnei shevitarti; הערת את הלב בים של צבעים = heart et halev beyam shel tzvaim; בן אדם, מה לך נרדם = ben adam, ma lecha nirdam.`;

export const ROMANIZATION_STANDARD = "backpack-hebrew";

export function translitRules(label) {
  return /hebrew/i.test(String(label || "")) ? `\n${HEBREW_TRANSLIT_RULES}` : "";
}

const FINALS = {
  "\u05DA": "\u05DB", // ך → כ
  "\u05DD": "\u05DE", // ם → מ
  "\u05DF": "\u05E0", // ן → נ
  "\u05E3": "\u05E4", // ף → פ
  "\u05E5": "\u05E6", // ץ → צ
};

const VOWEL_SOUND = {
  hatafsegol: "e",
  hatafpatah: "a",
  hatafkamatz: "o",
  hiriq: "i",
  tsere: "e",
  segol: "e",
  patah: "a",
  kamatz: "a",
  kamatzkatan: "o",
  holam: "o",
  qubuts: "u",
};

// Word-initial sheva is pronounced only for the common prefixes and gutturals.
// Everywhere else modern Israeli drops it (bracha, gvina, klavim, pri).
const VOCAL_INITIAL = new Set(["ל", "מ", "י", "נ", "ת", "ו", "א", "ה", "ח", "ע"]);
const GUTTURAL = new Set(["א", "ה", "ח", "ע"]);
const BEGED = new Set(["ב", "ג", "ד", "כ", "פ", "ת", "ך", "ף"]);

const LEXICON = Object.create(null);
const PHRASES = Object.create(null);

function addWord(hebrew, latin) {
  LEXICON[consonantKey(hebrew)] = latin;
}

function addPhrase(hebrew, latin) {
  PHRASES[phraseKey(hebrew)] = latin;
}

[
  ["מים", "mayim"], ["חלב", "chalav"], ["מיץ", "mitz"], ["תה", "te"], ["קפה", "kafe"],
  ["בקבוק", "bakbuk"], ["כוס", "kos"], ["קר", "kar"], ["חם", "cham"], ["צמא", "tzame"],
  ["אוכל", "ochel"], ["לחם", "lechem"], ["ביצה", "beitza"], ["גבינה", "gvina"],
  ["תפוח", "tapuach"], ["בננה", "banana"], ["עוגה", "uga"], ["עוגייה", "ugiya"],
  ["רעב", "raev"], ["טעים", "taim"], ["ירקות", "yerakot"], ["פירות", "perot"],
  ["בשר", "basar"], ["דג", "dag"], ["אורז", "orez"], ["לאכול", "leechol"],
  ["מתוק", "matok"], ["מלוח", "maluach"], ["חריף", "charif"], ["קינוח", "kinuach"],
  ["לישון", "lishon"], ["עייף", "ayef"], ["מיטה", "mita"], ["כרית", "karit"],
  ["שמיכה", "smicha"], ["חלום", "chalom"], ["לילה", "layla"], ["בוקר", "boker"],
  ["לקום", "lakum"], ["פיג'מה", "pijama"], ["שקט", "sheket"], ["ער", "er"],
  ["לנוח", "lanuach"], ["נמנם", "nimnem"], ["שעון", "shaon"], ["כוכבים", "kochavim"],
  ["ירח", "yareach"], ["סיפור", "sipur"], ["שיר", "shir"], ["ערש", "eres"],
  ["טוב", "tov"], ["שירותים", "sherutim"], ["חיתול", "chitul"], ["סבון", "sabon"],
  ["מגבת", "magevet"], ["מברשת", "mivreshet"], ["שיניים", "shinayim"],
  ["אמבטיה", "ambatya"], ["נקי", "naki"], ["מלוכלך", "meluchlach"], ["לשטוף", "lishtof"],
  ["חמים", "chamim"], ["קרים", "karim"], ["שמפו", "shampu"], ["מסרק", "masrek"],
  ["מראה", "mara"], ["כיור", "kiyor"], ["ברז", "berez"], ["משחת", "mishchat"],
  ["לנגב", "lenagev"], ["לשחק", "lesachek"], ["צעצוע", "tzaatzua"], ["כדור", "kadur"],
  ["בובה", "buba"], ["משחק", "mischak"], ["ציור", "tziyur"], ["ספר", "sefer"],
  ["ריקוד", "rikud"], ["חבר", "chaver"], ["לרוץ", "larutz"], ["לקפוץ", "likpotz"],
  ["לצחוק", "litzchok"], ["כיף", "kef"], ["חוץ", "chutz"], ["פנים", "panim"],
  ["גן", "gan"], ["נדנדה", "nadneda"], ["מגלשה", "maglesha"], ["חול", "chol"],
  ["אני", "ani"], ["רוצה", "rotze"], ["לשתות", "lishtot"], ["צריך", "tzarich"],
  ["אדום", "adom"], ["כחול", "kachol"], ["ירוק", "yarok"], ["צהוב", "tzahov"],
  ["כתום", "katom"], ["סגול", "sagol"], ["ורוד", "varod"], ["לבן", "lavan"],
  ["שחור", "shachor"], ["חום", "chum"], ["אפור", "afor"], ["זהב", "zahav"],
  ["יום", "yom"], ["ראשון", "rishon"], ["שני", "sheni"], ["שלישי", "shlishi"],
  ["רביעי", "revii"], ["חמישי", "chamishi"], ["שישי", "shishi"], ["שבת", "shabbat"],
  ["ינואר", "yanuar"], ["פברואר", "februar"], ["מרץ", "martz"], ["אפריל", "april"],
  ["מאי", "mai"], ["יוני", "yuni"], ["יולי", "yuli"], ["אוגוסט", "ogust"],
  ["ספטמבר", "september"], ["אוקטובר", "oktober"], ["נובמבר", "november"],
  ["דצמבר", "detzember"], ["שיער", "sear"], ["ראש", "rosh"], ["עין", "ayin"],
  ["עיניים", "einayim"], ["אוזן", "ozen"], ["אף", "af"], ["פה", "pe"],
  ["צוואר", "tzavar"], ["כתף", "katef"], ["חזה", "chaze"], ["לב", "lev"],
  ["גב", "gav"], ["יד", "yad"], ["בטן", "beten"], ["אצבע", "etzba"],
  ["רגל", "regel"], ["ברך", "berech"], ["כף", "kaf"], ["דוב", "dov"],
  ["כלב", "kelev"], ["פרח", "perach"], ["עץ", "etz"], ["בית", "bayit"],
  ["לעזור", "laazor"], ["שלום", "shalom"], ["תודה", "toda"], ["בבקשה", "bevakasha"],
  ["כן", "ken"], ["לא", "lo"], ["מה", "ma"], ["מי", "mi"], ["הוא", "hu"],
  ["היא", "hi"], ["אתה", "ata"], ["אנחנו", "anachnu"], ["יש", "yesh"],
  ["אין", "ein"], ["זה", "ze"], ["זאת", "zot"], ["כי", "ki"], ["עברית", "ivrit"],
  ["קוראים", "korim"], ["עובד", "oved"], ["אוהב", "ohev"], ["לומד", "lomed"],
  ["ברוך", "baruch"], ["תורה", "tora"], ["ברכה", "bracha"],
  ["נכנסת", "nichnast"], ["לחיי", "lechayai"], ["לפני", "lifnei"],
  ["שוויתרתי", "shevitarti"], ["הערת", "heart"], ["הלב", "halev"],
  ["בים", "beyam"], ["צבעים", "tzvaim"], ["בן", "ben"], ["אדם", "adam"],
  ["לך", "lecha"], ["נרדם", "nirdam"], ["של", "shel"],
].forEach(([h, l]) => addWord(h, l));

[
  ["נכנסת לחיי", "nichnast lechayai"],
  ["לפני שוויתרתי", "lifnei shevitarti"],
  ["הערת את הלב בים של צבעים", "heart et halev beyam shel tzvaim"],
  ["בן אדם, מה לך נרדם", "ben adam, ma lecha nirdam"],
  ["אני רוצה לשתות", "ani rotze lishtot"],
  ["אני רעב", "ani raev"],
  ["אני עייף", "ani ayef"],
  ["אני צריך שירותים", "ani tzarich sherutim"],
  ["אני רוצה לשחק", "ani rotze lesachek"],
].forEach(([h, l]) => addPhrase(h, l));

const ASHKENAZI = {
  shabbos: "shabbat",
  shabos: "shabbat",
  boruch: "baruch",
  borukh: "baruch",
  toyrah: "tora",
  toirah: "tora",
};

const memoryCache = new Map();
const STORAGE_KEY = "masteri.hebrewTranslit.v1";

export function hasHebrew(text) {
  return /[\u0590-\u05FF]/.test(String(text || ""));
}

export function stripHebrewMarks(text) {
  let out = "";
  for (const ch of String(text || "")) {
    const c = ch.codePointAt(0);
    if (c >= 0x0591 && c <= 0x05C7) continue;
    out += ch;
  }
  return out;
}

function isHebrewLetter(ch) {
  return ch >= "\u05D0" && ch <= "\u05EA";
}

function isMark(ch) {
  const c = ch.codePointAt(0);
  return c >= 0x0591 && c <= 0x05C7;
}

export function consonantKey(text) {
  let out = "";
  for (const ch of stripHebrewMarks(text)) {
    if (ch === "\u05F3" || ch === "\u05F4" || ch === "'" || ch === "\u2019") continue;
    const base = FINALS[ch] || ch;
    if (isHebrewLetter(base)) out += base;
  }
  return out;
}

export function phraseKey(text) {
  return stripHebrewMarks(text).replace(/\s+/g, " ").trim();
}

function hasVowelMark(text) {
  return /[\u05B0-\u05BB\u05C7]/.test(String(text || ""));
}

function hebrewWordCount(text) {
  return (phraseKey(text).match(/[\u05D0-\u05EA]/g) || []).length
    ? phraseKey(text).split(/\s+/).filter((w) => /[\u05D0-\u05EA]/.test(w)).length
    : 0;
}

function parseToken(letter, marks) {
  const vowels = [];
  let dagesh = false;
  let sin = false;
  for (const m of marks) {
    switch (m) {
      case "\u05B0": vowels.push("sheva"); break;
      case "\u05B1": vowels.push("hatafsegol"); break;
      case "\u05B2": vowels.push("hatafpatah"); break;
      case "\u05B3": vowels.push("hatafkamatz"); break;
      case "\u05B4": vowels.push("hiriq"); break;
      case "\u05B5": vowels.push("tsere"); break;
      case "\u05B6": vowels.push("segol"); break;
      case "\u05B7": vowels.push("patah"); break;
      case "\u05B8": vowels.push("kamatz"); break;
      case "\u05B9":
      case "\u05BA": vowels.push("holam"); break;
      case "\u05BB": vowels.push("qubuts"); break;
      case "\u05BC": dagesh = true; break;
      case "\u05C2": sin = true; break;
      case "\u05C7": vowels.push("kamatzkatan"); break;
      default: break;
    }
  }
  return { letter, vowels, dagesh, sin };
}

function tokenizeWord(word) {
  const chars = [...word];
  const tokens = [];
  for (let i = 0; i < chars.length; i++) {
    if (!isHebrewLetter(chars[i])) continue;
    const marks = [];
    let j = i + 1;
    while (j < chars.length && isMark(chars[j])) marks.push(chars[j++]);
    tokens.push(parseToken(chars[i], marks));
    i = j - 1;
  }
  return tokens;
}

function primaryVowel(token) {
  if (!token) return "";
  return token.vowels.find((v) => v !== "sheva") || (token.vowels.includes("sheva") ? "sheva" : "");
}

function shevaVocal(token, index, tokens) {
  if (!token.vowels.includes("sheva")) return false;
  if (index === tokens.length - 1) return false;
  const prev = index > 0 ? tokens[index - 1] : null;
  if (prev && prev.vowels.includes("sheva") && primaryVowel(prev) === "sheva") return true;
  if (index === 0) {
    const next = tokens[1];
    if (next && (next.letter === token.letter || GUTTURAL.has(next.letter))) return true;
    return VOCAL_INITIAL.has(token.letter);
  }
  if (token.dagesh && !BEGED.has(token.letter)) return true;
  return false;
}

function consonant(token, index) {
  const L = token.letter;
  const d = token.dagesh;
  if (L === "א" || L === "ע") return "";
  if (L === "ב") return d || index === 0 ? "b" : "v";
  if (L === "כ" || L === "ך") return d || (index === 0 && L === "כ") ? "k" : "ch";
  if (L === "פ" || L === "ף") return d || (index === 0 && L === "פ") ? "p" : "f";
  if (L === "ג") return "g";
  if (L === "ד") return "d";
  if (L === "ה") return "h";
  if (L === "ו") return "v";
  if (L === "ז") return "z";
  if (L === "ח") return "ch";
  if (L === "ט" || L === "ת") return "t";
  if (L === "י") return "y";
  if (L === "ל") return "l";
  if (L === "מ" || L === "ם") return "m";
  if (L === "נ" || L === "ן") return "n";
  if (L === "ס") return "s";
  if (L === "צ" || L === "ץ") return "tz";
  if (L === "ק") return "k";
  if (L === "ר") return "r";
  if (L === "ש") return token.sin ? "s" : "sh";
  return "";
}

function renderVocalized(tokens) {
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;
    const last = i === tokens.length - 1;
    const vowel = primaryVowel(t);
    const onlyPatah = vowel === "patah" && !t.vowels.some((v) => v !== "patah" && v !== "sheva");

    if (last && onlyPatah && (t.letter === "ח" || t.letter === "ע" || t.letter === "ה")) {
      out += "a";
      if (t.letter !== "ה") out += consonant(t, i);
      else if (t.dagesh) out += "h";
      continue;
    }
    if (t.letter === "ה" && last && !vowel && !t.dagesh) continue;
    if (t.letter === "ו" && t.dagesh && !vowel) {
      out += "u";
      continue;
    }
    if (t.letter === "ו" && vowel === "holam") {
      out += "o";
      continue;
    }
    if (t.letter === "ו" && !vowel && !t.dagesh) {
      const prevV = primaryVowel(prev);
      if (prevV === "holam" || prevV === "qubuts" || /[ou]$/.test(out)) continue;
    }
    if (t.letter === "י" && !vowel) {
      const prevV = primaryVowel(prev);
      if (prevV === "hiriq") continue;
      if (prevV === "tsere" || prevV === "segol") {
        out += "i";
        continue;
      }
    }
    if (t.letter === "י" && vowel === "sheva" && !shevaVocal(t, i, tokens)) {
      out += "y";
      continue;
    }

    const cons = consonant(t, i);
    let vow = "";
    if (vowel === "sheva") vow = shevaVocal(t, i, tokens) ? "e" : "";
    else if (vowel) vow = VOWEL_SOUND[vowel] || "";
    out += cons + vow;
  }
  return out;
}

function splitEdges(part) {
  const chars = [...part];
  let start = 0;
  while (start < chars.length && !isHebrewLetter(chars[start]) && !isMark(chars[start])) start++;
  let end = chars.length;
  while (end > start && !isHebrewLetter(chars[end - 1]) && !isMark(chars[end - 1])) end--;
  return {
    pre: chars.slice(0, start).join(""),
    core: chars.slice(start, end).join(""),
    post: chars.slice(end).join(""),
  };
}

// Dagesh chazak is not pronounced in Israeli Hebrew, so the engine writes one
// letter ("shabat"). A few familiar spellings double it ("shabbat"). When the
// lexicon form is that same pronunciation, keep the familiar spelling.
function preferFamiliar(core, rendered) {
  const hit = LEXICON[consonantKey(core)];
  if (!hit || !rendered) return rendered;
  const squash = (s) => s.replace(/([a-z])\1/g, "$1");
  return squash(hit) === squash(rendered) ? hit : rendered;
}

function renderPart(part) {
  const { pre, core, post } = splitEdges(part);
  if (!core) return part;
  if (hasVowelMark(core)) {
    const rendered = preferFamiliar(core, renderVocalized(tokenizeWord(core)));
    if (rendered && !hasHebrew(rendered)) return pre + rendered + post;
  }
  const hit = LEXICON[consonantKey(core)];
  if (hit) return pre + hit + post;
  return part;
}

/**
 * Deterministic romanization.
 * Confident for a known phrase, a known single word, or pointed (nikud) text.
 * Unvocalized sentences stay unconfident so the quality model can use context.
 */
export function transliterateHebrewSync(input) {
  const text = String(input || "").replace(/\s+/g, " ").trim();
  if (!text || !hasHebrew(text)) return { text: "", confident: false, source: "none" };

  const phrase = PHRASES[phraseKey(text)];
  if (phrase) return { text: phrase, confident: true, source: "phrase" };

  if (hebrewWordCount(text) === 1 && !hasVowelMark(text)) {
    const hit = LEXICON[consonantKey(text)];
    if (hit) return { text: hit, confident: true, source: "lexicon" };
  }

  if (hasVowelMark(text)) {
    const rendered = text.split(/(\s+)/).map((part) => (hasHebrew(part) ? renderPart(part) : part)).join("");
    const cleaned = rendered.replace(/\s+/g, " ").trim();
    const confident = !hasHebrew(cleaned) && cleaned.length > 0;
    if (confident) return { text: cleaned, confident: true, source: "nikud" };
  }

  return { text: "", confident: false, source: "none" };
}

function endsWithHe(hebrewWord) {
  const letters = [...stripHebrewMarks(hebrewWord)].filter(isHebrewLetter);
  return letters[letters.length - 1] === "ה";
}

function stripSilentFinalH(hebrewWord, latin) {
  if (!endsWithHe(hebrewWord)) return latin;
  if (/(?:ch|sh)$/i.test(latin)) return latin;
  if (/[aeiou]h$/i.test(latin)) return latin.slice(0, -1);
  return latin;
}

function cleanupToken(hebrewWord, latin) {
  let s = String(latin || "").trim();
  if (!s) return "";
  s = s.replace(/kh/g, "ch").replace(/Kh/g, "Ch").replace(/KH/g, "CH");
  s = s.replace(/['’]/g, "");
  if (/[צץ]/.test(stripHebrewMarks(hebrewWord))) {
    s = s.replace(/ts/g, "tz").replace(/Ts/g, "Tz").replace(/TS/g, "TZ");
  }
  const bare = s.toLowerCase();
  if (ASHKENAZI[bare] && LEXICON[consonantKey(hebrewWord)] === ASHKENAZI[bare]) {
    s = ASHKENAZI[bare];
  } else if (ASHKENAZI[bare]) {
    const key = consonantKey(hebrewWord);
    if ((bare === "shabbos" || bare === "shabos") && key === consonantKey("שבת")) s = "shabbat";
    if ((bare === "boruch" || bare === "borukh") && key === consonantKey("ברוך")) s = "baruch";
    if ((bare === "toyrah" || bare === "toirah") && key === consonantKey("תורה")) s = "tora";
  }
  s = stripSilentFinalH(hebrewWord, s);
  return s;
}

export function cleanupLoose(hebrew, stored) {
  const latin = String(stored || "").replace(/\s+/g, " ").trim();
  if (!latin) return "";
  const hParts = String(hebrew || "").trim().split(/\s+/);
  const lParts = latin.split(/\s+/);
  if (hParts.length === lParts.length && hParts.length > 0) {
    return hParts.map((h, i) => (hasHebrew(h) ? cleanupToken(h, lParts[i]) : lParts[i])).join(" ");
  }
  return cleanupToken(hebrew, latin);
}

function matchCase(sample, next) {
  if (!next) return "";
  if (!sample) return next;
  const sWords = String(sample).trim().split(/\s+/);
  const nWords = String(next).trim().split(/\s+/);
  if (sWords.length === nWords.length) {
    return nWords.map((w, i) => (/^[A-Z]/.test(sWords[i]) ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
  }
  if (/^[A-Z]/.test(String(sample).trim())) return next.charAt(0).toUpperCase() + next.slice(1);
  return next;
}

export function displayTransliteration(hebrew, stored) {
  const result = transliterateHebrewSync(hebrew);
  if (result.confident && result.text) return matchCase(stored, result.text);
  return cleanupLoose(hebrew, stored) || String(stored || "");
}

export function shownTransliteration(hebrew, stored) {
  if (!hasHebrew(hebrew)) return String(stored || "");
  return displayTransliteration(hebrew, stored);
}

function readStored(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    if (typeof localStorage !== "undefined") {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (all && typeof all[key] === "string") {
        memoryCache.set(key, all[key]);
        return all[key];
      }
    }
  } catch { /* private mode / quota */ }
  return null;
}

function writeStored(key, value) {
  memoryCache.set(key, value);
  try {
    if (typeof localStorage === "undefined") return;
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (all[key]) return;
    const keys = Object.keys(all);
    if (keys.length > 400) delete all[keys[0]];
    all[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

/**
 * Stable reading for one Hebrew string. A confident rule/lexicon result always
 * wins. Otherwise the first cleaned result is cached so a later model call
 * cannot flicker the spelling.
 */
export function settleTransliteration(hebrew, stored) {
  const key = phraseKey(hebrew);
  const result = transliterateHebrewSync(hebrew);
  if (result.confident && result.text) return matchCase(stored, result.text);
  const cached = key ? readStored(key) : null;
  if (cached) return cached;
  const fresh = cleanupLoose(hebrew, stored) || String(stored || "");
  if (key && fresh) writeStored(key, fresh);
  return fresh;
}

const TRANSLIT_FIELDS = [
  ["transliteration", ["hebrew", "hebrew_nikud", "hebrew_line", "fixed", "text"]],
  ["phonetic", ["hebrew", "hebrew_nikud", "word"]],
  ["example_sentence_transliteration", ["example_sentence_hebrew"]],
  ["infinitive_phonetic", ["infinitive_hebrew", "hebrew"]],
  ["question_transliteration", ["question_he", "hebrew"]],
  ["lyrics_transliteration", ["lyrics_he", "hebrew"]],
];

export function polishHebrewPayload(data) {
  return walk(data);
}

function walk(node) {
  if (Array.isArray(node)) return node.map(walk);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = walk(v);
  for (const [field, sources] of TRANSLIT_FIELDS) {
    if (typeof out[field] !== "string") continue;
    const src = sources.map((name) => out[name]).find((v) => typeof v === "string" && hasHebrew(v));
    if (!src) continue;
    out[field] = settleTransliteration(src, out[field]);
  }
  if (typeof out.hebrew === "string" && hasHebrew(out.hebrew) && typeof out.word === "string" && out.word.trim() && !hasHebrew(out.word)) {
    out.word = settleTransliteration(out.hebrew, out.word);
  }
  return out;
}

export function isHebrewTranslitPrompt(prompt) {
  const p = String(prompt || "");
  if (!/transliterat|phonetic|nikud/i.test(p)) return false;
  if (/spanish|french|portuguese|italian/i.test(p) && !/hebrew|עברית/i.test(p)) return false;
  return /hebrew|עברית|nikud/i.test(p) || hasHebrew(p);
}

export function prepareHebrewLlmArgs(args) {
  const src = args || {};
  const prompt = String(src.prompt || "");
  if (!isHebrewTranslitPrompt(prompt)) return src;
  const withRules = prompt.includes("modern Israeli Hebrew")
    ? prompt
    : `${prompt}\n\n${HEBREW_TRANSLIT_RULES}`;
  return {
    ...src,
    prompt: withRules,
    model: src.model || QUALITY_MODEL,
  };
}
