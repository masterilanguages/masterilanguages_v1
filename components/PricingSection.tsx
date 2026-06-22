"use client";

import { useState } from "react";

const FEATURES = [
  "Daily sessions and structure",
  "Vocabulary and speaking drills",
  "Accountability and coaching support",
  "Access to the Masteri Mnemonics System",
];

const PLANS = [
  {
    key: "foundation",
    header: "4 WEEKS • FOUNDATION",
    title: "Foundation",
    subtitle: "Build the habit and learn the Masteri system.",
    details: "Group Coaching • 1 Session Per Week",
    outcome: "Build a consistent language habit and master the learning process.",
    price: "$995",
    button: "Get Started",
    featured: false,
    badge: null,
  },
  {
    key: "kickstart",
    header: "4 WEEKS • MOST POPULAR",
    title: "Kickstart",
    subtitle: "The fastest way to start speaking with confidence.",
    details: "Private 1:1 Coaching • 3 Sessions Per Week",
    outcome: "Start speaking with confidence in everyday situations.",
    price: "$1,995",
    button: "Apply Now",
    featured: true,
    badge: "MOST POPULAR",
  },
  {
    key: "fluency",
    header: "8 WEEKS • PREMIUM",
    title: "Fluency Accelerator",
    subtitle: "Maximum support for accelerated fluency.",
    details: "Private 1:1 Coaching • 4 Sessions Per Week",
    outcome:
      "Hold real conversations comfortably and think more naturally in your target language.",
    price: "$3,795",
    button: "Apply Now",
    featured: false,
    badge: null,
  },
];

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

        <div className="grid gap-6 lg:grid-cols-3 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border p-8 transition ${
                plan.featured
                  ? "border-teal-600 bg-slate-950 text-white shadow-2xl"
                  : "border-slate-200 bg-white text-slate-900 shadow-sm"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-teal-500 px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Header tag */}
              <p
                className={`mb-5 text-[11px] font-bold uppercase tracking-widest ${
                  plan.featured ? "text-teal-400" : "text-teal-600"
                }`}
              >
                {plan.header}
              </p>

              {/* Title + subtitle */}
              <h3
                className={`text-2xl font-extrabold tracking-tight ${
                  plan.featured ? "text-white" : "text-slate-900"
                }`}
              >
                {plan.title}
              </h3>
              <p
                className={`mt-2 text-sm leading-relaxed ${
                  plan.featured ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {plan.subtitle}
              </p>

              {/* Program details */}
              <p
                className={`mt-4 text-xs font-semibold uppercase tracking-wide ${
                  plan.featured ? "text-teal-400" : "text-teal-700"
                }`}
              >
                {plan.details}
              </p>

              <div
                className={`my-6 h-px ${
                  plan.featured ? "bg-slate-800" : "bg-slate-100"
                }`}
              />

              {/* Included */}
              <p
                className={`mb-3 text-[11px] font-bold uppercase tracking-widest ${
                  plan.featured ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Included
              </p>
              <ul className="flex-1 space-y-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        plan.featured
                          ? "bg-teal-500 text-white"
                          : "bg-teal-100 text-teal-700"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`text-sm leading-snug ${
                        plan.featured ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Outcome */}
              <div
                className={`mt-6 rounded-xl p-4 ${
                  plan.featured ? "bg-slate-900" : "bg-slate-50"
                }`}
              >
                <p
                  className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${
                    plan.featured ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Outcome
                </p>
                <p
                  className={`text-sm leading-snug ${
                    plan.featured ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {plan.outcome}
                </p>
              </div>

              {/* Price */}
              <div className="mt-8">
                <p
                  className={`text-5xl font-extrabold tracking-tight ${
                    plan.featured ? "text-white" : "text-slate-900"
                  }`}
                >
                  {plan.price}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    plan.featured ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  One-time payment
                </p>
              </div>

              {/* Button */}
              <button
                onClick={() => handleCheckout(plan.key)}
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
          ))}
        </div>
      </div>
    </section>
  );
}
