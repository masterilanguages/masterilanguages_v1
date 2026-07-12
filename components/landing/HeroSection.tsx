"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MagneticButton } from "./fx";

// three.js is ~170 kB; keep it out of the initial bundle. Both draw onto a
// canvas from an effect, so deferring them changes nothing that is painted.
const NeonGrid = dynamic(() => import("./NeonGrid"), { ssr: false });
const ParticleCore = dynamic(() => import("./ParticleCore"), { ssr: false });

export type Variant = "centered" | "editorial" | "hud" | "holo" | "neon" | "core";

/** Types a string out character by character with a blinking caret. */
function Typewriter({ text, speed = 42 }: { text: string; speed?: number }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOut(text);
      return;
    }
    let i = 0;
    setOut("");
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span className="caret">{out}</span>;
}

/** Shared fade-up reveal for supporting elements (subtitle, CTAs, badges). */
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay },
});

function Ctas({ align = "center" }: { align?: "center" | "start" }) {
  return (
    <motion.div
      {...fade(0.9)}
      className={`mt-10 flex flex-wrap items-center gap-4 ${
        align === "center" ? "justify-center" : "justify-start"
      }`}
    >
      <MagneticButton
        href="/assessment"
        className="a-grad glow-cyan inline-block rounded-xl px-8 py-4 text-base font-bold text-slate-950 transition hover:brightness-110"
      >
        Create My Language Profile →
      </MagneticButton>
      <a
        href="#method"
        className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-white/5"
      >
        See the Method
      </a>
    </motion.div>
  );
}

/* ==============================================================
 * A · CENTERED — symmetrical, blur→focus word reveal
 * ============================================================== */
function CenteredHero() {
  const line1 = "This Is Not Another".split(" ");
  const base = 0.15;
  const step = 0.09;

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
      <motion.p
        {...fade(0.05)}
        className="mb-6 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] a-text backdrop-blur"
      >
        1-on-1 Language Coaching
      </motion.p>

      <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-7xl lg:text-8xl">
        <span className="block">
          {line1.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 22, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: base + i * step }}
            >
              {w}&nbsp;
            </motion.span>
          ))}
        </span>
        <motion.span
          className="block text-shine"
          initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.85,
            ease: [0.16, 1, 0.3, 1],
            delay: base + line1.length * step + 0.05,
          }}
        >
          Language App
        </motion.span>
      </h1>

      <motion.p
        {...fade(0.8)}
        className="mx-auto mt-8 max-w-2xl text-lg font-medium text-slate-300 sm:text-xl"
      >
        Know what to practice, when to practice, how to remember it, and when to use it.
      </motion.p>

      <Ctas align="center" />
    </div>
  );
}

/* ==============================================================
 * B · EDITORIAL — left-aligned, asymmetric, italic serif accent,
 * curtain line reveal, decorative "1:1" panel
 * ============================================================== */
function EditorialHero() {
  const lines = ["This Is Not", "Another"];

  return (
    <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.35fr_1fr]">
      <div className="text-left">
        <motion.p
          {...fade(0.05)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] a-text backdrop-blur"
        >
          1-on-1 Language Coaching
        </motion.p>

        <h1 className="font-display text-6xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          {lines.map((line, i) => (
            <span key={i} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                className="block"
                initial={{ y: "115%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.14 }}
              >
                {line}
              </motion.span>
            </span>
          ))}
          <span className="block overflow-hidden pb-[0.16em]">
            <motion.span
              className="block italic text-shine"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
              initial={{ y: "115%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 + 2 * 0.14 }}
            >
              Language App.
            </motion.span>
          </span>
        </h1>

        <motion.p
          {...fade(0.95)}
          className="mt-8 max-w-md text-lg font-medium text-slate-300 sm:text-xl"
        >
          Know what to practice, when to practice, how to remember it, and when to use it.
        </motion.p>

        <Ctas align="start" />
      </div>

      {/* Decorative right panel */}
      <motion.div {...fade(0.5)} className="relative hidden lg:block">
        <div className="glass-panel glow-border relative mx-auto flex aspect-square max-w-xs items-center justify-center rounded-[2rem]">
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-teal-400/25 to-cyan-400/5 blur-2xl" />
          <div className="relative text-center">
            <div className="font-display text-7xl font-extrabold text-shine">1:1</div>
            <div className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              Coaching, not apps
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ==============================================================
 * C · HUD — futuristic command-deck frame, mono type, typewriter
 * ============================================================== */
function HudHero() {
  const lines = ["This Is Not Another", "Language App"];
  const chips: [string, string][] = [
    ["TRACKS", "08"],
    ["STREAK", "14d"],
    ["LEVEL", "A1→C1"],
    ["MODE", "SPEAK"],
  ];

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl">
      <div className="relative rounded-3xl border border-teal-400/20 bg-white/[0.02] px-6 py-16 backdrop-blur-sm sm:px-14 sm:py-20">
        {/* corner ticks */}
        <span className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-teal-400/60" />
        <span className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-teal-400/60" />
        <span className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-teal-400/60" />
        <span className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-teal-400/60" />

        <div className="text-center">
          <motion.p
            {...fade(0.05)}
            className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-teal-300/90"
          >
            // FLUENCY ENGINE — 1:1 COACHING
          </motion.p>

          <h1 className="font-display text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-7xl">
            {lines.map((l, i) => (
              <span key={i} className="block overflow-hidden pb-[0.12em]">
                <motion.span
                  className={`block ${i === 1 ? "holo-text" : ""}`}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.14 }}
                >
                  {l}
                </motion.span>
              </span>
            ))}
          </h1>

          <p className="mt-6 font-mono text-sm text-slate-400">
            <span className="text-teal-400">&gt;</span>{" "}
            <Typewriter text="initializing your fastest path to fluency" />
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
            {chips.map(([k, v]) => (
              <span key={k} className="glass-panel rounded-md px-3 py-1.5">
                <span className="text-slate-500">{k} </span>
                <span className="text-teal-300">{v}</span>
              </span>
            ))}
          </div>

          <Ctas align="center" />
        </div>
      </div>
    </div>
  );
}

/* ==============================================================
 * D · HOLOGRAPHIC — oversized moving-gradient title, orb, magic border
 * ============================================================== */
function HoloHero() {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
      {/* rotating gradient orb behind the title */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, #2dd4bf, #38bdf8, #818cf8, #e879f9, #2dd4bf)",
        }}
      />

      <motion.p
        {...fade(0.05)}
        className="relative mb-6 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] a-text backdrop-blur"
      >
        1-on-1 Language Coaching
      </motion.p>

      <motion.h1
        {...fade(0.15)}
        className="font-display relative text-6xl font-black leading-[0.92] tracking-tight sm:text-8xl lg:text-[8.5rem]"
      >
        <span className="block holo-text">This Is Not</span>
        <span className="block holo-text">Another App</span>
      </motion.h1>

      <motion.p
        {...fade(0.5)}
        className="relative mx-auto mt-8 max-w-2xl text-lg font-medium text-slate-200 sm:text-xl"
      >
        Know what to practice, when to practice, how to remember it, and when to use it.
      </motion.p>

      <motion.div
        {...fade(0.75)}
        className="relative mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <a href="#method" className="magic-border group rounded-xl">
          <span className="relative block rounded-xl bg-slate-950/90 px-8 py-4 text-base font-bold text-white transition group-hover:bg-slate-900">
            Start Learning →
          </span>
        </a>
        <a
          href="#method"
          className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-cyan-400/50 hover:bg-white/5"
        >
          See How It Works
        </a>
      </motion.div>
    </div>
  );
}

/* ==============================================================
 * E · NEON GRID — synthwave 3D grid horizon, neon-glow title
 * ============================================================== */
function NeonGridHero() {
  const lines = ["This Is Not", "Another App"];
  return (
    <>
      <NeonGrid />
      {/* CSS synthwave sun behind the title */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[36%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,45,149,0.55), rgba(129,140,248,0.25) 55%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <motion.p
          {...fade(0.05)}
          className="mb-6 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200"
        >
          1-on-1 Language Coaching
        </motion.p>

        <h1 className="font-display neon-title text-6xl font-black uppercase leading-[0.95] tracking-tight sm:text-8xl">
          {lines.map((l, i) => (
            <span key={i} className="block overflow-hidden pb-[0.1em]">
              <motion.span
                className="block"
                initial={{ y: "115%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.14 }}
              >
                {l}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          {...fade(0.6)}
          className="mx-auto mt-8 max-w-xl text-lg font-medium text-slate-200/90"
        >
          Know what to practice, when to practice, how to remember it, and when to use it.
        </motion.p>

        <motion.div
          {...fade(0.85)}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton
            href="#method"
            className="neon-btn inline-block rounded-full border border-cyan-400/70 bg-cyan-400/10 px-8 py-4 text-base font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-400/20"
          >
            Start Learning →
          </MagneticButton>
          <a
            href="#method"
            className="rounded-full border border-fuchsia-400/50 px-8 py-4 text-base font-semibold uppercase tracking-wide text-fuchsia-200 transition hover:bg-fuchsia-400/10"
          >
            See How It Works
          </a>
        </motion.div>
      </div>
    </>
  );
}

/* ==============================================================
 * F · NEURAL CORE — interactive 3D particle core beside the title
 * ============================================================== */
function CoreHero() {
  return (
    <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-2">
      <div className="text-center lg:text-left">
        <motion.p
          {...fade(0.05)}
          className="mb-6 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.3em] a-text"
        >
          // PERSONALIZED MEMORY-BASED FLUENCY
        </motion.p>

        <h1 className="font-display text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block">Remember the Words</span>
          <span className="block holo-text">You Actually Need to Say</span>
        </h1>

        <motion.p
          {...fade(0.5)}
          className="mx-auto mt-8 max-w-md text-lg font-medium text-slate-300 lg:mx-0"
        >
          Personalized lessons built from your life — with memory hooks that make the words stick.
        </motion.p>

        <motion.div
          {...fade(0.75)}
          className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
        >
          <a href="/assessment" className="magic-border group rounded-xl">
            <span className="relative block rounded-xl bg-slate-950/90 px-8 py-4 text-base font-bold text-white transition group-hover:bg-slate-900">
              Create My Language Profile →
            </span>
          </a>
          <a
            href="#method"
            className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-cyan-400/50 hover:bg-white/5"
          >
            See the Method
          </a>
        </motion.div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-md">
        <ParticleCore />
      </div>
    </div>
  );
}

/* ==============================================================
 * Public API — the shell owns the variant state and theme
 * ============================================================== */
export const HERO_OPTIONS: [Variant, string][] = [
  ["centered", "A · Centrado"],
  ["editorial", "B · Editorial"],
  ["hud", "C · HUD"],
  ["holo", "D · Holo"],
  ["neon", "E · Neon"],
  ["core", "F · Core"],
];

/** Which page-wide accent palette each hero design drives. */
const VARIANT_THEME: Record<Variant, string> = {
  centered: "default",
  editorial: "default",
  hud: "default",
  holo: "holo",
  neon: "neon",
  core: "holo",
};

export function themeForVariant(v: Variant): string {
  return VARIANT_THEME[v];
}

export function Hero({ variant, nonce }: { variant: Variant; nonce: number }) {
  switch (variant) {
    case "editorial":
      return <EditorialHero key={`editorial-${nonce}`} />;
    case "hud":
      return <HudHero key={`hud-${nonce}`} />;
    case "holo":
      return <HoloHero key={`holo-${nonce}`} />;
    case "neon":
      return <NeonGridHero key={`neon-${nonce}`} />;
    case "core":
      return <CoreHero key={`core-${nonce}`} />;
    default:
      return <CenteredHero key={`centered-${nonce}`} />;
  }
}
