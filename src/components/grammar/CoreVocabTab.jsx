import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const SECTIONS = [
  {
    id: "time",
    emoji: "⏰",
    title: "Time & Structure",
    color: "#5a6b5a",
    items: [
      { hebrew: "הַיּוֹם", transliteration: "hayóm", english: "today" },
      { hebrew: "מָחָר", transliteration: "machár", english: "tomorrow" },
      { hebrew: "אֶתְמוֹל", transliteration: "etmól", english: "yesterday" },
      { hebrew: "עַכְשָׁיו", transliteration: "achsháv", english: "now" },
      { hebrew: "תָּמִיד", transliteration: "tamíd", english: "always" },
      { hebrew: "יוֹם רִאשׁוֹן", transliteration: "yom rishón", english: "Sunday" },
      { hebrew: "יוֹם שֵׁנִי", transliteration: "yom shení", english: "Monday" },
      { hebrew: "יוֹם שְׁלִישִׁי", transliteration: "yom shlishí", english: "Tuesday" },
      { hebrew: "יוֹם רְבִיעִי", transliteration: "yom rviʼí", english: "Wednesday" },
      { hebrew: "יוֹם חֲמִישִׁי", transliteration: "yom chamishí", english: "Thursday" },
      { hebrew: "יוֹם שִׁשִּׁי", transliteration: "yom shishí", english: "Friday" },
      { hebrew: "שַׁבָּת", transliteration: "shabát", english: "Saturday / Shabbat" },
      { hebrew: "יָנוּאָר", transliteration: "yanúar", english: "January" },
      { hebrew: "פֶבְרוּאָר", transliteration: "febrúar", english: "February" },
      { hebrew: "מָרְץ", transliteration: "mártz", english: "March" },
      { hebrew: "אַפְרִיל", transliteration: "apríl", english: "April" },
      { hebrew: "מַאי", transliteration: "mái", english: "May" },
      { hebrew: "יוּנִי", transliteration: "yúni", english: "June" },
      { hebrew: "יוּלִי", transliteration: "yúli", english: "July" },
      { hebrew: "אוֹגוּסְט", transliteration: "ogúst", english: "August" },
      { hebrew: "סֶפְטֶמְבֶּר", transliteration: "septémber", english: "September" },
      { hebrew: "אוֹקְטוֹבֶר", transliteration: "október", english: "October" },
      { hebrew: "נוֹבֶמְבֶּר", transliteration: "novémber", english: "November" },
      { hebrew: "דֶצֶמְבֶּר", transliteration: "detsémbær", english: "December" },
      { hebrew: "אֶחָד", transliteration: "echád", english: "1 (one)" },
      { hebrew: "שְׁנַיִם", transliteration: "shnaím", english: "2 (two)" },
      { hebrew: "שְׁלוֹשָׁה", transliteration: "shlosháh", english: "3 (three)" },
      { hebrew: "אַרְבָּעָה", transliteration: "arbaʼáh", english: "4 (four)" },
      { hebrew: "חֲמִישָׁה", transliteration: "chamishàh", english: "5 (five)" },
      { hebrew: "שִׁשָּׁה", transliteration: "shisháh", english: "6 (six)" },
      { hebrew: "שִׁבְעָה", transliteration: "shivʼáh", english: "7 (seven)" },
      { hebrew: "שְׁמוֹנָה", transliteration: "shmoná", english: "8 (eight)" },
      { hebrew: "תִּשְׁעָה", transliteration: "tisháh", english: "9 (nine)" },
      { hebrew: "עֶשֶׂר", transliteration: "éser", english: "10 (ten)" },
      { hebrew: "עֶשְׂרִים", transliteration: "esrím", english: "20 (twenty)" },
      { hebrew: "חֲמִישִּׁים", transliteration: "chamishím", english: "50 (fifty)" },
      { hebrew: "מֵאָה", transliteration: "meʼáh", english: "100 (hundred)" },
      { hebrew: "אֶלֶף", transliteration: "élef", english: "1000 (thousand)" },
    ],
  },
  {
    id: "questions",
    emoji: "❓",
    title: "Question Words",
    color: "#6b5a2e",
    items: [
      { hebrew: "מָה", transliteration: "ma", english: "what" },
      { hebrew: "מִי", transliteration: "mi", english: "who" },
      { hebrew: "אֵיפֹה", transliteration: "eifó", english: "where" },
      { hebrew: "מָתַי", transliteration: "matái", english: "when" },
      { hebrew: "לָמָּה", transliteration: "láma", english: "why" },
      { hebrew: "אֵיךְ", transliteration: "eich", english: "how" },
      { hebrew: "כַּמָּה", transliteration: "kamá", english: "how much / how many" },
    ],
  },
  {
    id: "core_verbs",
    emoji: "⚡",
    title: "Core Verbs",
    color: "#3a4a6b",
    items: [
      { hebrew: "לִהְיוֹת", transliteration: "lihiót", english: "to be" },
      { hebrew: "לַעֲשׂוֹת", transliteration: "laʼasót", english: "to do / make" },
      { hebrew: "לָלֶכֶת", transliteration: "laléchæt", english: "to go / walk" },
      { hebrew: "לָבוֹא", transliteration: "lavó", english: "to come" },
      { hebrew: "לָקַחַת", transliteration: "lakáchat", english: "to take" },
      { hebrew: "לָתֵת", transliteration: "latét", english: "to give" },
      { hebrew: "לִבְחֹר", transliteration: "livchór", english: "to choose" },
      { hebrew: "לִשְׁלֹחַ", transliteration: "lishlóach", english: "to send" },
      { hebrew: "לְדַבֵּר", transliteration: "ledabér", english: "to speak / talk" },
      { hebrew: "לִרְאוֹת", transliteration: "lirʼót", english: "to see" },
      { hebrew: "לֶאֱהֹב", transliteration: "leʼehóv", english: "to love" },
      { hebrew: "לוֹמַר", transliteration: "lomár", english: "to say" },
      { hebrew: "לָשֶׁבֶת", transliteration: "lashévet", english: "to sit" },
      { hebrew: "לֶאֱכֹל", transliteration: "leʼekhól", english: "to eat" },
      { hebrew: "לִשְׁתּוֹת", transliteration: "lishtót", english: "to drink" },
      { hebrew: "לִישׁוֹן", transliteration: "lishón", english: "to sleep" },
      { hebrew: "לַחְשׁוֹב", transliteration: "lachshóv", english: "to think" },
      { hebrew: "לִכְתּוֹב", transliteration: "lichtóv", english: "to write" },
      { hebrew: "לִקְרֹא", transliteration: "likró", english: "to read / call" },
      { hebrew: "לַעֲזֹר", transliteration: "laʼazór", english: "to help" },
    ],
  },
  {
    id: "pronouns",
    emoji: "👤",
    title: "Pronouns",
    color: "#5a3a6b",
    items: [
      { hebrew: "אֲנִי", transliteration: "aní", english: "I" },
      { hebrew: "אַתָּה", transliteration: "atá", english: "you (male)" },
      { hebrew: "אַת", transliteration: "át", english: "you (female)" },
      { hebrew: "הוּא", transliteration: "hu", english: "he" },
      { hebrew: "הִיא", transliteration: "hi", english: "she" },
      { hebrew: "אֲנַחְנוּ", transliteration: "anáchnu", english: "we" },
      { hebrew: "אַתֶּם", transliteration: "atém", english: "you all (male)" },
      { hebrew: "אַתֶּן", transliteration: "atén", english: "you all (female)" },
      { hebrew: "הֵם", transliteration: "hem", english: "they (male)" },
      { hebrew: "הֵן", transliteration: "hen", english: "they (female)" },
    ],
  },
  {
    id: "connectors",
    emoji: "🔗",
    title: "Connectors",
    color: "#6b3a3a",
    items: [
      { hebrew: "וְ", transliteration: "ve", english: "and" },
      { hebrew: "אֲבָל", transliteration: "avál", english: "but" },
      { hebrew: "כִּי", transliteration: "ki", english: "because" },
      { hebrew: "אָז", transliteration: "az", english: "so / then" },
      { hebrew: "גַּם", transliteration: "gam", english: "also / too" },
      { hebrew: "רַק", transliteration: "rak", english: "only / just" },
      { hebrew: "אוֹ", transliteration: "o", english: "or" },
      { hebrew: "אִם", transliteration: "im", english: "if" },
      { hebrew: "כְּשֶׁ", transliteration: "kshe", english: "when (conjunction)" },
      { hebrew: "לְכֵן", transliteration: "lachén", english: "therefore" },
    ],
  },
  {
    id: "prepositions",
    emoji: "📍",
    title: "Prepositions",
    color: "#3a5a6b",
    items: [
      { hebrew: "בְּ", transliteration: "be", english: "in / at" },
      { hebrew: "לְ", transliteration: "le", english: "to / for" },
      { hebrew: "מִ / מֵ", transliteration: "mi / me", english: "from" },
      { hebrew: "עִם", transliteration: "im", english: "with" },
      { hebrew: "עַל", transliteration: "al", english: "on / about" },
      { hebrew: "אֶל", transliteration: "el", english: "to (toward)" },
      { hebrew: "שֶׁל", transliteration: "shel", english: "of / belonging to" },
      { hebrew: "בִּין", transliteration: "bein", english: "between" },
      { hebrew: "לִפְנֵי", transliteration: "lifnéi", english: "before / in front of" },
      { hebrew: "אַחֲרֵי", transliteration: "acharéi", english: "after" },
    ],
  },
  {
    id: "adjectives",
    emoji: "🎨",
    title: "Descriptors (Adjectives)",
    color: "#6b5a3a",
    items: [
      { hebrew: "טוֹב", transliteration: "tov", english: "good" },
      { hebrew: "רַע", transliteration: "ra", english: "bad" },
      { hebrew: "גָּדוֹל", transliteration: "gadól", english: "big" },
      { hebrew: "קָטָן", transliteration: "katán", english: "small" },
      { hebrew: "חָדָשׁ", transliteration: "chadásh", english: "new" },
      { hebrew: "יָשָׁן", transliteration: "yashán", english: "old" },
      { hebrew: "יָפֶה", transliteration: "yafé", english: "beautiful / nice" },
      { hebrew: "חָזָק", transliteration: "chazák", english: "strong" },
      { hebrew: "קַל", transliteration: "kal", english: "easy / light" },
      { hebrew: "קָשֶׁה", transliteration: "kashé", english: "hard / difficult" },
      { hebrew: "מְהִיר", transliteration: "mahír", english: "fast" },
      { hebrew: "אִטִּי", transliteration: "ití", english: "slow" },
      { hebrew: "חָם", transliteration: "cham", english: "hot / warm" },
      { hebrew: "קַר", transliteration: "kar", english: "cold" },
      { hebrew: "מְעַנְיֵן", transliteration: "meʼanyén", english: "interesting" },
    ],
  },
  {
    id: "nouns",
    emoji: "🏠",
    title: "Daily Life Nouns",
    color: "#4a6b3a",
    items: [
      { hebrew: "בַּיִת", transliteration: "báyit", english: "house / home" },
      { hebrew: "עֲבוֹדָה", transliteration: "avodá", english: "work / job" },
      { hebrew: "כֶּסֶף", transliteration: "késef", english: "money" },
      { hebrew: "זְמַן", transliteration: "zmán", english: "time" },
      { hebrew: "יוֹם", transliteration: "yom", english: "day" },
      { hebrew: "אֹכֶל", transliteration: "ókhel", english: "food" },
      { hebrew: "מַיִם", transliteration: "máyim", english: "water" },
      { hebrew: "אָדָם", transliteration: "adám", english: "person / man" },
      { hebrew: "אִשָּׁה", transliteration: "isháh", english: "woman / wife" },
      { hebrew: "יֶלֶד", transliteration: "yéled", english: "child / boy" },
      { hebrew: "מִשְׁפָּחָה", transliteration: "mishpachá", english: "family" },
      { hebrew: "חָבֵר", transliteration: "chavér", english: "friend (male)" },
      { hebrew: "עִיר", transliteration: "ír", english: "city" },
      { hebrew: "אוֹכֶל", transliteration: "ókhel", english: "food" },
      { hebrew: "בִּגְדֵי", transliteration: "bigdéi", english: "clothes" },
      { hebrew: "מַחְשֵׁב", transliteration: "machshév", english: "computer" },
      { hebrew: "טֶלֶפוֹן", transliteration: "telefón", english: "phone" },
      { hebrew: "מְכוֹנִית", transliteration: "mekhonít", english: "car" },
      { hebrew: "דֶּרֶךְ", transliteration: "dérech", english: "road / way" },
      { hebrew: "שָׁנָה", transliteration: "shaná", english: "year" },
    ],
  },
];

function SectionCard({ section }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-stone-50/50 transition-all"
        style={{ background: `linear-gradient(135deg, ${section.color}12, ${section.color}08)` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.emoji}</span>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#3d4a2e', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              {section.title}
            </h3>
            <p className="text-stone-400 text-xs">{section.items.length} words</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#6b7c5a' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              <div className="grid gap-1.5">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{
                      background: idx % 2 === 0 ? '#ffffff60' : '#f5f0e840',
                      border: '1px solid #e8e4d850'
                    }}
                  >
                    {/* English */}
                    <span className="text-sm text-stone-500 w-28 flex-shrink-0">{item.english}</span>
                    {/* Transliteration */}
                    <span className="text-sm font-medium flex-1 text-center" style={{ color: '#5a6b3a' }}>
                      {item.transliteration}
                    </span>
                    {/* Hebrew */}
                    <span
                      className="text-lg font-bold text-right flex-shrink-0 w-28"
                      dir="rtl"
                      style={{ color: '#3d4a2e' }}
                    >
                      {item.hebrew}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CoreVocabTab() {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl mb-2" style={{ background: '#5a6b5a18', border: '1px solid #5a6b5a30' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: '#3d4a2e' }}>📚 Core Vocabulary</p>
        <p className="text-xs" style={{ color: '#5a6b5a' }}>
          The essential building blocks of Hebrew — high-frequency words organized by category. Master these and you can handle most everyday conversations.
        </p>
      </div>
      {SECTIONS.map(section => (
        <SectionCard key={section.id} section={section} />
      ))}
    </div>
  );
}