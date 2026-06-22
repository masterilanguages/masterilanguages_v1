"use client";

import { useState } from "react";

const CORE_FEATURES = [
  "Daily sessions and structure",
  "Vocabulary and speaking drills",
  "Accountability and coaching support",
  "Access to the Masteri Mnemonics System",
];

const ELITE_FEATURES = [
  "Daily sessions and structure",
  "Vocabulary and speaking drills",
  "Accountability and coaching support",
  "Access to the Masteri Mnemonics System",
  "Personalized fluency roadmap",
  "Custom curriculum development",
  "Quarterly fluency assessments",
  "Priority coach access",
  "Real-world conversation training",
  "Speaking, listening, reading, and writing development",
];

const PLANS = [
  {
    key: "foundation",
    header: "4 WEEKS • FOUNDATION",
    title: "Foundation",
    subtitle: "Build the habit and learn the Masteri system.",
    details: "Group Coaching • 1 Session Per Week",
    features: CORE_FEATURES,
    outcome: "Build a consistent language habit and master the learning process.",
    price: "$995",
    priceNote: "One-time payment",
    button: "Get Started",
    featured: false,
    elite: false,
    badge: null,
  },
  {
    key: "kickstart",
    header: "4 WEEKS • MOST POPULAR",
    title: "Kickstart",
    subtitle: "The fastest way to start speaking with confidence.",
    details: "Private 1:1 Coaching • 3 Sessions Per Week",
    features: CORE_FEATURES,
    outcome: "Start speaking with confidence in everyday situations.",
    price: "$1,995",
    priceNote: "One-time payment",
    button: "Apply Now",
    featured: true,
    elite: false,
    badge: "MOST POPULAR",
  },
  {
    key: "fluency",
    header: "8 WEEKS • PREMIUM",
    title: "Fluency Accelerator",
    subtitle: "Maximum support for accelerated fluency.",
    details: "Private 1:1 Coaching • 4 Sessions Per Week",
    features: CORE_FEATURES,
    outcome:
      "Hold real conversations comfortably and think more naturally in your target language.",
    price: "$3,795",
    priceNote: "One-time payment",
    button: "Apply Now",
    featured: false,
    elite: false,
    badge: null,
  },
];

const ELITE_PLAN = {
  key: "accelerator",
  header: "12 MONTHS • ELITE",
  title: "Masteri Accelerator",
  subtitle:
    "From beginner to confident speaker with a year of structured coaching and accountability.",
  details: "Immersive Coaching • 5 Sessions Per Week",
  features: ELITE_FEATURES,
  outcome:
    "Develop advanced speaking ability, long-term retention, and real-world fluency through a full year of guided coaching and accountability.",
  price: "$4,500",
  priceNote: "/ Quarter · 4 Quarterly Payments · 12 Months",
  note: "Designed for learners committed to achieving real fluency.",
  button: "Apply for Mastery",
  badge: "ELITE PROGRAM",
};

function PlanCard({
  plan,
  loading,
  onCheckout,
}: {
  plan: (typeof PLANS)[0];
  loading: string | null;
  onCheckout: (key: string) => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 transition ${
        plan.featured
          ? "border-teal-600 bg-slate-950 text-white shadow-2xl"
          : "border-slate-200 bg-white text-slate-900 shadow-sm"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-teal-500 px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            {plan.badge}
          </span>
        </div>
      )}

      <p className={`mb-5 text-[11px] font-bold uppercase tracking-widest ${plan.featured ? "text-teal-400" : "text-teal-600"}`}>
        {plan.header}
      </p>

      <h3 className={`text-2xl font-extrabold tracking-tight ${plan.featured ? "text-white" : "text-slate-900"}`}>
        {plan.title}
      </h3>
      <p className={`mt-2 text-sm leading-relaxed ${plan.featured ? "text-slate-400" : "text-slate-500"}`}>
        {plan.subtitle}
      </p>

      <p className={`mt-4 text-xs font-semibold uppercase tracking-wide ${plan.featured ? "text-teal-400" : "text-teal-700"}`}>
        {plan.details}
      </p>

      <div className={`my-6 h-px ${plan.featured ? "bg-slate-800" : "bg-slate-100"}`} />

      <p className={`mb-3 text-[11px] font-bold uppercase tracking-widest ${plan.featured ? "text-slate-500" : "text-slate-400"}`}>
        Included
      </p>
      <ul className="flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${plan.featured ? "bg-teal-500 text-white" : "bg-teal-100 text-teal-700"}`}>
              ✓
            </span>
            <span className={`text-sm leading-snug ${plan.featured ? "text-slate-300" : "text-slate-700"}`}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <div className={`mt-6 rounded-xl p-4 ${plan.featured ? "bg-slate-900" : "bg-slate-50"}`}>
        <p className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${plan.featured ? "text-slate-500" : "text-slate-400"}`}>
          Outcome
        </p>
        <p className={`text-sm leading-snug ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>
          {plan.outcome}
        </p>
      </div>

      <div className="mt-8">
        <p className={`text-5xl font-extrabold tracking-tight ${plan.featured ? "text-white" : "text-slate-900"}`}>
          {plan.price}
        </p>
        <p className={`mt-1 text-xs ${plan.featured ? "text-slate-500" : "text-slate-400"}`}>
          {plan.priceNote}
        </p>
      </div>

      <button
        onClick={() => onCheckout(plan.key)}
        disabled={loading === plan.key}
        className={`mt-6 w-full rounded-xl py-4 text-sm font-bold tracking-wide transition disabled:opacity-60 ${
          plan.featured
            ? "bg-teal-500 text-white hover:bg-teal-400"
            : "border border-slate-300 bg-white text-slate-900 hover:border-teal-600 hover:text-teal-700"
        }`}
      >
        {loading === plan.key ? "Redirecting…" : plan.button}
      </button>
    </div>
  );
}

export default function PricingSection() {
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
    <section id="programs" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-600">
            Programs
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Choose Your Program
          </h2>
        </div>

        {/* Top 3 cards */}
        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          {PLANS.map((plan) => (
            <PlanCard key={plan.key} plan={plan} loading={loading} onCheckout={handleCheckout} />
          ))}
        </div>

        {/* Elite card */}
        <div className="mt-6 relative">
          {/* Gold border glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 p-px">
            <div className="h-full w-full rounded-2xl bg-slate-950" />
          </div>

          <div className="relative flex flex-col rounded-2xl bg-slate-950 p-10 text-white lg:flex-row lg:gap-12">
            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-5 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-900">
                {ELITE_PLAN.badge}
              </span>
            </div>

            {/* Left column */}
            <div className="flex-1">
              <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-amber-400">
                {ELITE_PLAN.header}
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight text-white">
                {ELITE_PLAN.title}
              </h3>
              <p className="mt-2 max-w-md text-slate-400 text-sm leading-relaxed">
                {ELITE_PLAN.subtitle}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-400">
                {ELITE_PLAN.details}
              </p>

              <div className="my-6 h-px bg-slate-800" />

              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Included
              </p>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {ELITE_PLAN.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-900">
                      ✓
                    </span>
                    <span className="text-sm leading-snug text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl bg-slate-900 p-4">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Outcome
                </p>
                <p className="text-sm leading-snug text-slate-300">{ELITE_PLAN.outcome}</p>
              </div>
            </div>

            {/* Right column — pricing + CTA */}
            <div className="mt-8 flex flex-col justify-between lg:mt-0 lg:min-w-[240px]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Investment
                </p>
                <p className="mt-2 text-6xl font-extrabold tracking-tight text-white">
                  $4,500
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-400">/ Quarter</p>
                <p className="mt-1 text-xs text-slate-500">4 Quarterly Payments · 12 Months</p>

                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs leading-relaxed text-slate-400 italic">
                    "{ELITE_PLAN.note}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleCheckout(ELITE_PLAN.key)}
                disabled={loading === ELITE_PLAN.key}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 py-4 text-sm font-bold tracking-wide text-slate-900 transition hover:from-amber-300 hover:to-yellow-200 disabled:opacity-60"
              >
                {loading === ELITE_PLAN.key ? "Redirecting…" : ELITE_PLAN.button}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
