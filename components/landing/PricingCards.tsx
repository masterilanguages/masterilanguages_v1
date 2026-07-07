"use client";

import { Reveal, TiltCard } from "./fx";

const CORE_FEATURES = [
  "Vocabulary and speaking drills",
  "Accountability and coaching support",
  "Access to the Masteri Mnemonics System",
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
    subtitle: "Build the habit and learn the Masteri system.",
    details: "Group Coaching\n1 Session/Week + Daily Practice",
    features: CORE_FEATURES,
    outcome: "Build the habit. Master the system.",
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
    subtitle: "The fastest way to start speaking with confidence.",
    details: "Private 1:1 Coaching\n3 Sessions/Week + Daily Practice",
    features: CORE_FEATURES,
    outcome: "Speak confidently in everyday situations.",
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
    subtitle: "Maximum support for accelerated fluency.",
    details: "Private 1:1 Coaching\n4 Sessions/Week + Daily Practice",
    features: CORE_FEATURES,
    outcome: "Think and speak naturally in conversation.",
    price: "$3,795",
    priceNote: "One-time payment",
    button: "Apply Now",
    badge: null,
    featured: false,
  },
];

function PlanCard({ plan }: { plan: Plan }) {
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

      <a
        href="/assessment"
        className={`mt-5 block w-full rounded-xl py-3.5 text-center text-sm font-bold tracking-wide transition ${
          plan.featured
            ? "a-grad text-slate-950 hover:brightness-110"
            : "border border-white/15 bg-white/5 text-white hover:border-cyan-400/50 hover:text-cyan-300"
        }`}
      >
        {plan.button}
      </a>
    </TiltCard>
  );
}

export default function PricingCards() {
  return (
    <section id="programs" className="relative z-10 border-t border-white/10 px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 text-center">
          <p className="a-text mb-3 text-xs font-semibold uppercase tracking-[0.25em]">Programs</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Choose Your Program
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
                <PlanCard plan={plan} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
