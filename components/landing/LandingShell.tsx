"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Hero, HERO_OPTIONS, themeForVariant, type Variant } from "./HeroSection";
import DemoSection from "./DemoSection";
import NewsletterForm from "@/components/NewsletterForm";
import { Reveal, TiltCard, Marquee, Meteors, Sparkles, LandingNav, MagneticButton } from "./fx";

// Deferred so three.js lands in a lazy chunk. The .bg-navy-mesh CSS gradient
// underneath is the fallback until the canvas mounts.
const WebGLAurora = dynamic(() => import("./WebGLAurora"), { ssr: false });

const SCENARIOS = [
  "Personal introduction",
  "Work conversations",
  "Career vocabulary",
  "Memory hooks",
  "Personalized practice texts",
  "Speaking prompts",
  "Daily routine",
  "Travel goals",
  "Real conversation drills",
  "Guided review",
];

const WHO = [
  "You forget words after learning them once.",
  "You want to speak without freezing.",
  "You want lessons built around your actual life.",
  "You learn better through stories, images, sound, and association.",
  "You want structure, accountability, and guided speaking practice.",
  "You want to connect to people through real conversation, not textbook scripts.",
];

const METHOD = [
  {
    step: "1",
    title: "Personalize",
    hook: "Tell us who you are, what you do, what you care about, and which conversations you want to have.",
    body: "Your language profile becomes the foundation for your curriculum.",
  },
  {
    step: "2",
    title: "Encode",
    hook: "We turn new words and phrases into memory hooks: images, stories, sounds, and personal references.",
    body: "Instead of memorizing random lists, you attach language to things your brain already understands.",
  },
  {
    step: "3",
    title: "Speak",
    hook: "Practice with guided prompts, personalized texts, and real conversation drills.",
    body: "You learn to use the language in sentences that sound like you.",
  },
  {
    step: "4",
    title: "Retain",
    hook: "Your memory map, review schedule, and practice materials — organized and always ready.",
    body: "The goal is not just to learn words. The goal is to have them available when you need them.",
  },
];

/**
 * The live landing page. `/` renders the client-approved "core" hero with no
 * switcher; `/preview` renders the same page with the design switcher exposed
 * so other hero variants can still be demoed.
 */
export default function LandingShell({
  initialVariant = "core",
  showSwitcher = false,
}: {
  initialVariant?: Variant;
  showSwitcher?: boolean;
}) {
  const [variant, setVariant] = useState<Variant>(initialVariant);
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
      data-landing-theme={themeForVariant(variant)}
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

      <LandingNav />

      {/* Hero */}
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
              Learn the Language Your Brain Will Actually Keep
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-400">
              No random vocabulary lists. No generic textbook chapters. Your lessons are built from
              your story, your goals, your routines, and the conversations you actually want to have.
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
              Built for People Who Want Language to Stick
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
              Personalized mnemonics for real conversation.
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Masteri combines memory science, personal curriculum, and guided speaking practice so
              you can remember what to say and use it when it matters.
            </p>
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

      {/* Interactive demo — see your life become a lesson */}
      <DemoSection />

      {/* Final CTA — book a call */}
      <section id="book" className="relative z-10 border-t border-white/10 px-6 py-28 text-center">
        <Reveal>
          <p className="a-text mb-3 text-xs font-semibold uppercase tracking-[0.25em]">
            Free · 30 Minutes
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Book Your Free Strategy Call
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-slate-400">
            We&apos;ll map out your goals, show you the method, and build a plan around the
            conversations you want to have.
          </p>
        </Reveal>

        {/* What happens on the call — reduces friction */}
        <Reveal delay={0.08}>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { icon: "🎯", title: "Your goals", body: "We learn your story, level, and the conversations that matter to you." },
              { icon: "🧠", title: "The method", body: "See how personalized mnemonics make new words actually stick." },
              { icon: "🗺️", title: "Your plan", body: "Leave with a clear path — no pressure, no obligation." },
            ].map((s) => (
              <div key={s.title} className="glass-panel rounded-2xl p-5 text-left">
                <div className="mb-2 text-2xl">{s.icon}</div>
                <p className="font-display text-base font-bold text-white">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton
              href="/book"
              className="a-grad glow-cyan inline-block rounded-2xl px-10 py-5 text-lg font-bold text-slate-950 transition hover:brightness-110"
            >
              Book My Free Call →
            </MagneticButton>
            <a
              href="https://wa.me/13059007863?text=Hi%20Masteri%2C%20I%27d%20like%20to%20book%20a%20call%20about%20your%20programs."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-8 py-5 text-lg font-bold text-slate-950 shadow-[0_0_30px_-6px_rgba(37,211,102,0.7)] transition hover:brightness-110"
            >
              <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.257.59 4.463 1.712 6.408L3.2 28.8l6.56-1.72a12.74 12.74 0 0 0 6.24 1.62h.005c7.06 0 12.8-5.74 12.8-12.8s-5.744-12.7-12.8-12.7zm0 23.05h-.004a10.6 10.6 0 0 1-5.4-1.48l-.387-.23-4.014 1.052 1.07-3.914-.252-.4a10.58 10.58 0 0 1-1.62-5.63c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.108 7.52 3.12a10.56 10.56 0 0 1 3.114 7.52c0 5.86-4.77 10.62-10.63 10.62zm5.83-7.96c-.32-.16-1.89-.93-2.183-1.037-.293-.107-.507-.16-.72.16-.213.32-.826 1.037-1.013 1.25-.187.213-.373.24-.693.08-.32-.16-1.35-.497-2.57-1.586-.95-.847-1.59-1.893-1.777-2.213-.187-.32-.02-.493.14-.653.144-.143.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.986-2.374-.26-.623-.523-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.094-1.12 2.667s1.146 3.093 1.306 3.307c.16.213 2.253 3.44 5.46 4.827.763.33 1.36.526 1.824.674.767.244 1.464.21 2.015.127.615-.092 1.89-.773 2.156-1.52.267-.747.267-1.387.187-1.52-.08-.133-.293-.213-.613-.373z"/>
              </svg>
              WhatsApp Us
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Prefer to talk now? Call{" "}
            <a href="tel:+13059007863" className="text-slate-300 hover:text-white">
              +1.305.900.7863
            </a>
          </p>
        </Reveal>
      </section>

      {/* Newsletter */}
      <section className="relative z-10 border-t border-white/10 px-6 py-20">
        <Reveal className="mx-auto max-w-xl text-center">
          <div className="glass-panel glow-border rounded-3xl p-8 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-white">
              Get the Free Memory-Based Fluency Toolkit
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              Learn the vocabulary, mnemonic, and speaking techniques Masteri students use to
              remember more and speak with confidence.
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
        © {new Date().getFullYear()} Masteri Languages · All rights reserved
      </footer>

      {/* Floating design + theme switcher — /preview only */}
      {showSwitcher && (
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
      )}
    </div>
  );
}
