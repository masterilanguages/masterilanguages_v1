"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "./fx";

/* ────────────────────────────────────────────────────────────────────────────
 * Front-end-only demo: templates per language turn the visitor's answers into
 * a line-by-line mini-lesson (target line / optional transliteration / English)
 * plus static vocabulary and mnemonic cards. No API calls.
 * ──────────────────────────────────────────────────────────────────────────── */

type LangKey = "hebrew" | "spanish" | "french" | "italian" | "portuguese";

type Answers = {
  name: string;
  from: string;
  job: string;
  hobbies: string;
  reason: string;
};

type Line = { target: string; translit?: string; english: string; rtl?: boolean };

type Mnemonic = {
  word: string;
  meaning: string;
  hook: string;
  gradient: string;
  emoji: string;
};

const LANGUAGES: { key: LangKey; label: string }[] = [
  { key: "hebrew", label: "Hebrew" },
  { key: "spanish", label: "Spanish" },
  { key: "french", label: "French" },
  { key: "italian", label: "Italian" },
  { key: "portuguese", label: "Portuguese" },
];

/** Split "tennis and music" / "tennis, music" into two parts. */
function splitHobbies(input: string): [string, string | null] {
  const parts = input
    .split(/,| and | y | e /i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [input.trim(), null];
}

function buildLines(lang: LangKey, a: Answers): Line[] {
  const [h1, h2] = splitHobbies(a.hobbies);
  const hob = (sep: string) => (h2 ? `${h1}${sep}${h2}` : h1);

  switch (lang) {
    case "hebrew":
      return [
        {
          target: `קוראים לי ${a.name}.`,
          translit: `Kor'im li ${a.name}.`,
          english: `My name is ${a.name}.`,
          rtl: true,
        },
        {
          target: `אני מ־${a.from}.`,
          translit: `Ani mi-${a.from}.`,
          english: `I am from ${a.from}.`,
          rtl: true,
        },
        {
          target: `אני עובד בתור ${a.job}.`,
          translit: `Ani oved betor ${a.job}.`,
          english: `I work as a ${a.job}.`,
          rtl: true,
        },
        {
          target: `אני אוהב ${hob(" ו־")}.`,
          translit: `Ani ohev ${h2 ? `${h1} ve-${h2}` : h1}.`,
          english: `I love ${hob(" and ")}.`,
          rtl: true,
        },
        {
          target: `אני לומד עברית כי ${a.reason}.`,
          translit: `Ani lomed Ivrit ki ${a.reason}.`,
          english: `I am learning Hebrew because ${a.reason}.`,
          rtl: true,
        },
      ];
    case "spanish":
      return [
        { target: `Me llamo ${a.name}.`, english: `My name is ${a.name}.` },
        { target: `Soy de ${a.from}.`, english: `I am from ${a.from}.` },
        { target: `Trabajo como ${a.job}.`, english: `I work as a ${a.job}.` },
        { target: `Me encanta ${hob(" y ")}.`, english: `I love ${hob(" and ")}.` },
        {
          target: `Estoy aprendiendo español porque ${a.reason}.`,
          english: `I am learning Spanish because ${a.reason}.`,
        },
      ];
    case "french":
      return [
        { target: `Je m'appelle ${a.name}.`, english: `My name is ${a.name}.` },
        { target: `Je viens de ${a.from}.`, english: `I am from ${a.from}.` },
        { target: `Je travaille comme ${a.job}.`, english: `I work as a ${a.job}.` },
        { target: `J'adore ${hob(" et ")}.`, english: `I love ${hob(" and ")}.` },
        {
          target: `J'apprends le français parce que ${a.reason}.`,
          english: `I am learning French because ${a.reason}.`,
        },
      ];
    case "italian":
      return [
        { target: `Mi chiamo ${a.name}.`, english: `My name is ${a.name}.` },
        { target: `Vengo da ${a.from}.`, english: `I am from ${a.from}.` },
        { target: `Lavoro come ${a.job}.`, english: `I work as a ${a.job}.` },
        { target: `Adoro ${hob(" e ")}.`, english: `I love ${hob(" and ")}.` },
        {
          target: `Sto imparando l'italiano perché ${a.reason}.`,
          english: `I am learning Italian because ${a.reason}.`,
        },
      ];
    case "portuguese":
      return [
        { target: `Meu nome é ${a.name}.`, english: `My name is ${a.name}.` },
        { target: `Sou de ${a.from}.`, english: `I am from ${a.from}.` },
        { target: `Trabalho como ${a.job}.`, english: `I work as a ${a.job}.` },
        { target: `Adoro ${hob(" e ")}.`, english: `I love ${hob(" and ")}.` },
        {
          target: `Estou aprendendo português porque ${a.reason}.`,
          english: `I am learning Portuguese because ${a.reason}.`,
        },
      ];
  }
}

const VOCAB: Record<LangKey, { word: string; meaning: string }[]> = {
  hebrew: [
    { word: "קוראים לי (kor'im li)", meaning: "my name is" },
    { word: "אני (ani)", meaning: "I / I am" },
    { word: "עובד (oved)", meaning: "work" },
    { word: "אוהב (ohev)", meaning: "love" },
    { word: "לומד (lomed)", meaning: "learn" },
    { word: "כי (ki)", meaning: "because" },
  ],
  spanish: [
    { word: "me llamo", meaning: "my name is" },
    { word: "soy de", meaning: "I am from" },
    { word: "trabajo", meaning: "I work" },
    { word: "me encanta", meaning: "I love" },
    { word: "aprender", meaning: "to learn" },
    { word: "porque", meaning: "because" },
  ],
  french: [
    { word: "je m'appelle", meaning: "my name is" },
    { word: "je viens de", meaning: "I come from" },
    { word: "je travaille", meaning: "I work" },
    { word: "j'adore", meaning: "I love" },
    { word: "apprendre", meaning: "to learn" },
    { word: "parce que", meaning: "because" },
  ],
  italian: [
    { word: "mi chiamo", meaning: "my name is" },
    { word: "vengo da", meaning: "I come from" },
    { word: "lavoro", meaning: "I work" },
    { word: "adoro", meaning: "I love" },
    { word: "imparare", meaning: "to learn" },
    { word: "perché", meaning: "because" },
  ],
  portuguese: [
    { word: "meu nome é", meaning: "my name is" },
    { word: "sou de", meaning: "I am from" },
    { word: "trabalho", meaning: "I work" },
    { word: "adoro", meaning: "I love" },
    { word: "aprender", meaning: "to learn" },
    { word: "porque", meaning: "because" },
  ],
};

const MNEMONICS: Record<LangKey, Mnemonic[]> = {
  hebrew: [
    {
      word: "אוהב · ohev",
      meaning: "love",
      hook: "Sounds like “oh, heaven!” — loving something feels like heaven.",
      gradient: "from-rose-500/40 via-fuchsia-500/30 to-indigo-500/40",
      emoji: "💙",
    },
    {
      word: "לומד · lomed",
      meaning: "learn",
      hook: "Picture a LOw MEDal you earn every day you learn.",
      gradient: "from-teal-400/40 via-cyan-500/30 to-sky-500/40",
      emoji: "🥇",
    },
    {
      word: "אני · ani",
      meaning: "I / me",
      hook: "“ANI” — Absolutely No Imposter: it's really me.",
      gradient: "from-amber-400/40 via-orange-500/30 to-rose-500/40",
      emoji: "🪞",
    },
  ],
  spanish: [
    {
      word: "me llamo",
      meaning: "my name is",
      hook: "Picture a LLAMA wearing a name tag with your name on it.",
      gradient: "from-teal-400/40 via-cyan-500/30 to-sky-500/40",
      emoji: "🦙",
    },
    {
      word: "me encanta",
      meaning: "I love",
      hook: "It enCHANTs you — what you love casts a spell on you.",
      gradient: "from-rose-500/40 via-fuchsia-500/30 to-indigo-500/40",
      emoji: "✨",
    },
    {
      word: "aprender",
      meaning: "to learn",
      hook: "You APPREHEND an idea and lock it in your brain.",
      gradient: "from-amber-400/40 via-orange-500/30 to-rose-500/40",
      emoji: "🧠",
    },
  ],
  french: [
    {
      word: "je m'appelle",
      meaning: "my name is",
      hook: "An APPLE with your name carved into it.",
      gradient: "from-rose-500/40 via-red-500/30 to-amber-500/40",
      emoji: "🍎",
    },
    {
      word: "j'adore",
      meaning: "I love",
      hook: "A DOOR you happily open to the things you love.",
      gradient: "from-teal-400/40 via-cyan-500/30 to-sky-500/40",
      emoji: "🚪",
    },
    {
      word: "apprendre",
      meaning: "to learn",
      hook: "An APPRENTICE learning the craft, one day at a time.",
      gradient: "from-indigo-500/40 via-violet-500/30 to-fuchsia-500/40",
      emoji: "🎓",
    },
  ],
  italian: [
    {
      word: "mi chiamo",
      meaning: "my name is",
      hook: "KEY-AH-MO — a key that unlocks the door and calls your name.",
      gradient: "from-teal-400/40 via-cyan-500/30 to-sky-500/40",
      emoji: "🗝️",
    },
    {
      word: "adoro",
      meaning: "I love",
      hook: "“I aDORE Old Rome” — love with an Italian O at the end.",
      gradient: "from-rose-500/40 via-fuchsia-500/30 to-indigo-500/40",
      emoji: "🏛️",
    },
    {
      word: "imparare",
      meaning: "to learn",
      hook: "You IMPART knowledge to yourself — im-pa-RA-re.",
      gradient: "from-amber-400/40 via-orange-500/30 to-rose-500/40",
      emoji: "📚",
    },
  ],
  portuguese: [
    {
      word: "meu nome é",
      meaning: "my name is",
      hook: "“NO-meh” — your NAME with a warm Portuguese melody.",
      gradient: "from-teal-400/40 via-cyan-500/30 to-sky-500/40",
      emoji: "🎵",
    },
    {
      word: "adoro",
      meaning: "I love",
      hook: "A DOOR O-pens to everything you adore.",
      gradient: "from-rose-500/40 via-fuchsia-500/30 to-indigo-500/40",
      emoji: "🚪",
    },
    {
      word: "aprender",
      meaning: "to learn",
      hook: "APPREHEND each new word — catch it and keep it.",
      gradient: "from-indigo-500/40 via-violet-500/30 to-fuchsia-500/40",
      emoji: "🫳",
    },
  ],
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 backdrop-blur transition focus:border-cyan-400/60 focus:outline-none";

export default function DemoSection() {
  const [form, setForm] = useState<Answers & { language: LangKey }>({
    name: "",
    from: "",
    job: "",
    hobbies: "",
    reason: "",
    language: "hebrew",
  });
  const [result, setResult] = useState<{
    lang: LangKey;
    lines: Line[];
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const canSubmit =
    form.name.trim() && form.from.trim() && form.job.trim() && form.hobbies.trim() && form.reason.trim();

  const handleGenerate = () => {
    if (!canSubmit || generating) return;
    setGenerating(true);
    setResult(null);
    // Small delay so the reveal feels like generation, not an instant swap.
    setTimeout(() => {
      setResult({ lang: form.language, lines: buildLines(form.language, form) });
      setGenerating(false);
    }, 1400);
  };

  const langLabel = LANGUAGES.find((l) => l.key === (result?.lang ?? form.language))?.label ?? "";

  return (
    <section id="demo" className="relative z-10 border-t border-white/10 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto mb-12 max-w-3xl text-center">
          <p className="a-text mb-3 text-xs font-semibold uppercase tracking-[0.25em]">
            Try It · Demo Preview
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            See Your Life Become a Language Lesson
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Answer a few questions and generate a personalized introduction in the language you
            want to learn — with translation and memory hooks to help it stick.
          </p>
        </Reveal>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.3fr]">
          {/* ── Form ── */}
          <Reveal>
            <div className="glass-panel glow-border rounded-3xl p-7 sm:p-8">
              <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                About you
              </p>
              <div className="space-y-4">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="First name"
                  className={inputCls}
                />
                <input
                  value={form.from}
                  onChange={(e) => set("from", e.target.value)}
                  placeholder="Where are you from?"
                  className={inputCls}
                />
                <input
                  value={form.job}
                  onChange={(e) => set("job", e.target.value)}
                  placeholder="What do you do? (e.g. language teacher)"
                  className={inputCls}
                />
                <input
                  value={form.hobbies}
                  onChange={(e) => set("hobbies", e.target.value)}
                  placeholder="Two hobbies or interests (e.g. tennis and music)"
                  className={inputCls}
                />
                <input
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder="Why are you learning? (e.g. I want to connect with people)"
                  className={inputCls}
                />
                <select
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.key} value={l.key} className="bg-slate-900">
                      {l.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerate}
                  disabled={!canSubmit || generating}
                  className="a-grad glow-cyan w-full rounded-xl py-4 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {generating ? "Building your lesson…" : "Generate My Sample Lesson →"}
                </button>
                <p className="text-center text-xs text-slate-500">
                  Powered by Backpack, Masteri&apos;s personalized curriculum engine.
                </p>
              </div>
            </div>
          </Reveal>

          {/* ── Output ── */}
          <Reveal delay={0.1}>
            <div className="relative min-h-[420px]">
              <AnimatePresence mode="wait">
                {!result && !generating && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-panel flex min-h-[420px] flex-col items-center justify-center rounded-3xl p-10 text-center"
                  >
                    <div className="a-grad-br glow-cyan mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
                      ✨
                    </div>
                    <p className="max-w-xs text-sm leading-relaxed text-slate-400">
                      Your personalized mini-lesson will appear here — in the language you choose,
                      built from your answers.
                    </p>
                  </motion.div>
                )}

                {generating && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-panel flex min-h-[420px] flex-col items-center justify-center rounded-3xl p-10 text-center"
                  >
                    <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
                    <p className="text-sm text-slate-400">
                      Turning your life into {LANGUAGES.find((l) => l.key === form.language)?.label}…
                    </p>
                  </motion.div>
                )}

                {result && !generating && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="glass-panel glow-border rounded-3xl p-7 sm:p-9"
                  >
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="a-text text-[11px] font-bold uppercase tracking-widest">
                          Your Personalized Mini-Lesson
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Built from your answers · {langLabel}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Demo preview
                      </span>
                    </div>

                    {/* Lesson lines */}
                    <div className="space-y-5">
                      {result.lines.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.12 }}
                          className="border-b border-white/5 pb-4 last:border-0 last:pb-0"
                        >
                          <p
                            dir={line.rtl ? "rtl" : "ltr"}
                            className={`text-lg font-semibold text-white ${
                              line.rtl ? "text-right" : ""
                            }`}
                          >
                            {line.target}
                          </p>
                          {line.translit && (
                            <p className="mt-0.5 text-sm italic text-cyan-300/80">{line.translit}</p>
                          )}
                          <p className="mt-0.5 text-sm text-slate-400">{line.english}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Key vocabulary */}
                    <div className="mt-8">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Key Vocabulary
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {VOCAB[result.lang].map((v) => (
                          <span
                            key={v.word}
                            className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs"
                          >
                            <span className="font-semibold text-white">{v.word}</span>
                            <span className="text-slate-500"> · {v.meaning}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Mnemonic cards */}
                    <div className="mt-8">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Memory Hooks
                      </p>
                      <p className="mb-4 text-xs text-slate-500">
                        Memory hooks help your brain attach new words to images, stories, and
                        sounds.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {MNEMONICS[result.lang].map((m, i) => (
                          <motion.div
                            key={m.word}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.15 }}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                          >
                            <div
                              className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${m.gradient}`}
                            >
                              <span className="text-4xl drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                                {m.emoji}
                              </span>
                              <span className="absolute right-2 top-2 rounded-full bg-slate-950/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-300 backdrop-blur">
                                Memory Hook
                              </span>
                            </div>
                            <div className="p-4">
                              <p className="text-sm font-bold text-white">{m.word}</p>
                              <p className="a-text text-xs font-semibold">{m.meaning}</p>
                              <p className="mt-2 text-xs leading-relaxed text-slate-400">{m.hook}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
