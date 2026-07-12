"use client";

import { useState } from "react";
import { Reveal, TiltCard } from "./fx";

const FOUNDATION_FEATURES = [
  "Personal language profile",
  "Vocabulary and speaking drills",
  "Personalized memory hooks",
  "Access to Backpack: your memory map and review plan",
];

const KICKSTART_FEATURES = [
  "Personal language profile",
  "Custom “about me” text in your target language",
  "Personalized memory hooks and speaking drills",
  "Access to Backpack: practice texts, review plan, and memory map",
  "Accountability and coaching support",
];

const FLUENCY_FEATURES = [
  "Personal language profile",
  "Custom curriculum built around your goals",
  "Personalized mnemonic system",
  "Conversation drills and pronunciation support",
  "Access to Backpack: memory map, practice texts, and review schedule",
  "High-accountability coaching support",
];

type Plan = {
  key: string;
  header: string;
  title: string;
  subtitle: string;
  details: string;
  features: string[];
  outcome: string;
  price: string;
  priceNote: string;
  button: string;
  badge: string | null;
  featured: boolean;
};

const PLANS: Plan[] = [
  {
    key: "foundation",
    header: "4 WEEKS • FOUNDATION",
    title: "Foundation",
    subtitle: "Build your language profile, learn the Masteri memory system, and start creating language you can actually remember.",
    details: "Group Coaching\n1 Session/Week + Guided Daily Practice",
    features: FOUNDATION_FEATURES,
    outcome: "Build the habit. Create your first memorable foundation.",
    price: "$995",
    priceNote: "One-time payment",
    button: "Get Started",
    badge: null,
    featured: false,
  },
  {
    key: "kickstart",
    header: "4 WEEKS • MOST POPULAR",
    title: "Kickstart",
    subtitle: "The fastest way to start speaking with personalized mnemonics, private coaching, and daily practice.",
    details: "Private 1:1 Coaching\n3 Sessions/Week + Guided Daily Practice",
    features: KICKSTART_FEATURES,
    outcome: "Speak confidently using language built around your life.",
    price: "$1,995",
    priceNote: "One-time payment",
    button: "Apply Now",
    badge: "MOST POPULAR",
    featured: true,
  },
  {
    key: "fluency",
    header: "8 WEEKS • PREMIUM",
    title: "Fluency Accelerator",
    subtitle: "A fully guided, personalized path for deeper support, stronger retention, and faster speaking progress.",
    details: "Private 1:1 Coaching\n4 Sessions/Week + Guided Daily Practice",
    features: FLUENCY_FEATURES,
    outcome: "Think, remember, and speak naturally in real conversations.",
    price: "$3,795",
    priceNote: "One-time payment",
    button: "Apply Now",
    badge: null,
    featured: false,
  },
];

function PlanCard({
  plan,
  loading,
  onCheckout,
}: {
  plan: Plan;
  loading: string | null;
  onCheckout: (key: string) => void;
}) {
  return (
    <TiltCard
      className={`group relative flex h-full flex-col rounded-2xl border p-7 transition-colors ${
        plan.featured
          ? "a-border-strong a-glow bg-gradient-to-b from-[#0c1638] to-[#070b1f]"
          : "glass-panel glow-border hover:border-cyan-400/40"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="a-grad glow-cyan rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-950">
            {plan.badge}
          </span>
        </div>
      )}

      <h3 className="font-display text-xl font-extrabold tracking-tight text-white">{plan.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{plan.subtitle}</p>

      <p className="a-text mt-5 text-[11px] font-bold uppercase tracking-widest">
        {plan.header}
      </p>
      <p className="a-text mt-1 whitespace-pre-line text-xs font-semibold uppercase tracking-wide">
        {plan.details}
      </p>

      <div className="my-5 h-px bg-white/10" />

      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Included</p>
      <ul className="flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                plan.featured ? "a-grad-br text-slate-950" : "a-text bg-white/10"
              }`}
            >
              ✓
            </span>
            <span className="text-sm leading-snug text-slate-300">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl bg-white/[0.04] p-4">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Outcome</p>
        <p className="text-sm leading-snug text-slate-300">{plan.outcome}</p>
      </div>

      <div className="mt-7">
        <p
          className={`font-display text-4xl font-extrabold tracking-tight ${
            plan.featured ? "text-shine" : "text-white"
          }`}
        >
          {plan.price}
        </p>
        <p className="mt-1 text-xs text-slate-500">{plan.priceNote}</p>
      </div>

      <button
        onClick={() => onCheckout(plan.key)}
        disabled={loading === plan.key}
        className={`mt-5 w-full rounded-xl py-3.5 text-center text-sm font-bold tracking-wide transition disabled:opacity-60 ${
          plan.featured
            ? "a-grad text-slate-950 hover:brightness-110"
            : "border border-white/15 bg-white/5 text-white hover:border-cyan-400/50 hover:text-cyan-300"
        }`}
      >
        {loading === plan.key ? "Redirecting…" : plan.button}
      </button>
    </TiltCard>
  );
}

export default function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    setLoading(planKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  };

  return (
    <section id="programs" className="relative z-10 border-t border-white/10 px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 text-center">
          <p className="a-text mb-3 text-xs font-semibold uppercase tracking-[0.25em]">Programs</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Choose Your Masteri Path
          </h2>
        </Reveal>

        <div className="mx-auto grid max-w-5xl items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.key}
              delay={i * 0.1}
              className={plan.featured ? "lg:-mt-4 lg:mb-4" : ""}
            >
              <div className="h-full [perspective:1200px]">
                <PlanCard plan={plan} loading={loading} onCheckout={handleCheckout} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
