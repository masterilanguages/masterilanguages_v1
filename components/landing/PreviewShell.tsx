"use client";

import { useState } from "react";
import WebGLAurora from "./WebGLAurora";
import { Hero, HERO_OPTIONS, themeForVariant, type Variant } from "./HeroSection";
import PricingCards from "./PricingCards";
import NewsletterForm from "@/components/NewsletterForm";
import { Reveal, TiltCard, Marquee, Meteors, Sparkles, PreviewNav, MagneticButton } from "./fx";

const SCENARIOS = [
  "Real Estate scenarios",
  "Life Insurance scenarios",
  "Sales conversations",
  "Business vocabulary",
  "Personalized coaching",
  "English for Event Specialists",
];

const WHO = [
  "You want to understand native speakers when they talk.",
  "You want to speak without freezing.",
  "You want to connect to a culture through its language.",
  "You've tried apps before but didn't stay consistent.",
  "You need structure, accountability, and someone guiding you.",
];

const METHOD = [
  {
    step: "1",
    title: "Assess",
    hook: "Discover your level, goals, and learning style.",
    body: "We evaluate where you are today and identify the fastest path to fluency.",
  },
  {
    step: "2",
    title: "Structure",
    hook: "A step-by-step system with lessons, speaking, vocabulary, and daily accountability.",
    body: "",
  },
  {
    step: "3",
    title: "Practice",
    hook: "Speak consistently with expert coaching.",
    body: "Build confidence through real conversations, immediate feedback, and guided repetition.",
  },
  {
    step: "4",
    title: "Retain",
    hook: "Remember more and progress faster.",
    body: "Masteri's mnemonic system helps vocabulary stick through stories, visual associations, and active recall.",
  },
];

export default function PreviewShell() {
  const [variant, setVariant] = useState<Variant>("neon");
  const [nonce, setNonce] = useState(0);
  const pick = (v: Variant) => {
    setVariant(v);
    setNonce((n) => n + 1);
  };

  const btn = (active: boolean) =>
    `rounded-full px-3 py-1.5 font-semibold transition ${
      active ? "a-grad text-slate-950" : "text-slate-300 hover:text-white"
    }`;

  return (
    <div
      data-preview-theme={themeForVariant(variant)}
      className="relative min-h-screen overflow-x-clip text-white"
    >
      {/* Background: CSS aurora fallback + live WebGL + theme wash */}
      <div aria-hidden className="bg-navy-mesh fixed inset-0 -z-10" />
      <WebGLAurora />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, rgb(var(--c2) / 0.07), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgb(var(--c1) / 0.06), transparent 70%)",
        }}
      />

      <PreviewNav />

      {/* Hero (design chosen from the switcher) */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-28">
        <Sparkles count={44} />
        <Meteors count={12} />

        <Hero variant={variant} nonce={nonce} />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-slate-500">
          Scroll ↓
        </div>
      </section>

      {/* Career scenarios */}
      <section className="relative z-10 border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Learn the Language You Need for Your Career
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              No boring textbook lessons. No random apps. No memorizing words you&apos;ll never use.
            </p>
          </Reveal>
        </div>
        <div className="mt-10">
          <Marquee items={SCENARIOS} />
        </div>
      </section>

      {/* Who it's for */}
      <section className="relative z-10 border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Built for People Who Want to Speak
            </h2>
            <p className="mt-3 text-slate-400">Masteri is for you if:</p>
          </Reveal>
          <ul className="mt-8 space-y-4">
            {WHO.map((item, i) => (
              <Reveal key={item} delay={i * 0.07}>
                <li className="glass-panel flex items-start gap-4 rounded-2xl px-6 py-4 transition hover:border-cyan-400/30">
                  <span className="a-grad-br glow-cyan mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-950">
                    ✓
                  </span>
                  <span className="text-slate-200">{item}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* The Masteri Method (tilt cards) */}
      <section id="method" className="relative z-10 border-t border-white/10 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-14 max-w-3xl">
            <p className="a-text mb-3 text-xs font-semibold uppercase tracking-[0.25em]">
              The Masteri Method
            </p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              A proven system that combines coaching, accountability, and memory science to help you
              speak confidently faster.
            </h2>
          </Reveal>

          <div className="grid gap-6 [perspective:1200px] sm:grid-cols-2 lg:grid-cols-4">
            {METHOD.map(({ step, title, hook, body }, i) => (
              <Reveal key={step} delay={i * 0.1}>
                <TiltCard className="glass-panel glow-border flex h-full flex-col rounded-2xl p-7 transition-colors hover:border-cyan-400/40">
                  <div className="a-grad-br glow-cyan mb-4 flex h-11 w-11 items-center justify-center rounded-full font-display text-base font-extrabold text-slate-950">
                    {step}
                  </div>
                  <h3 className="font-display text-xl font-extrabold text-white">{title}</h3>
                  <p className="a-text mt-2 text-sm font-semibold">{hook}</p>
                  {body && (
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{body}</p>
                  )}
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingCards />

      {/* Final CTA */}
      <section className="relative z-10 border-t border-white/10 px-6 py-28 text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Start Speaking With Confidence
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Apply now and we&apos;ll see if Masteri is the right fit for you.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 flex justify-center">
            <MagneticButton
              href="/book"
              className="a-grad glow-cyan inline-block rounded-2xl px-10 py-5 text-lg font-bold text-slate-950 transition hover:brightness-110"
            >
              Book Your Strategy Call
            </MagneticButton>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Or email us directly at hello@masterilanguages.com
          </p>
        </Reveal>
      </section>

      {/* Newsletter */}
      <section className="relative z-10 border-t border-white/10 px-6 py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <div className="glass-panel glow-border rounded-3xl p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-white">Get the Free Fluency Toolkit</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              Learn the vocabulary, memory, and speaking techniques our students use to accelerate
              fluency.
            </p>
            <div className="mt-6">
              <NewsletterForm />
            </div>
            <p className="mt-4 text-xs text-slate-500">Free. No spam. Unsubscribe anytime.</p>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Masteri Languages · All rights reserved ·{" "}
        <a href="/dashboard" className="transition hover:text-slate-300">
          Admin
        </a>
      </footer>

      {/* Floating design + theme switcher — remove before shipping */}
      <div className="glass-panel fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-wrap items-center justify-end gap-1 rounded-2xl px-2 py-1.5 text-xs shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]">
        <span className="px-2 text-[11px] uppercase tracking-wider text-slate-400">Diseño</span>
        {HERO_OPTIONS.map(([v, label]) => (
          <button key={v} onClick={() => pick(v)} className={btn(variant === v)}>
            {label}
          </button>
        ))}
        <button
          onClick={() => setNonce((n) => n + 1)}
          className="rounded-full px-2.5 py-1.5 text-slate-300 transition hover:text-white"
          title="Repetir animación"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
