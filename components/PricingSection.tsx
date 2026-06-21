"use client";

import { useState } from "react";

const PLANS = [
  {
    key: "kickstart",
    label: "Kickstart",
    duration: "4 Weeks",
    description: "For students who need momentum and structure.",
    price: "$1,995",
    features: [
      "Daily sessions per week",
      "Daily practice plan",
      "Vocabulary and speaking drills",
      "Accountability and tools",
    ],
    featured: false,
  },
  {
    key: "fluency",
    label: "Fluency Accelerator",
    duration: "8 Weeks",
    description: "For students who want real progress in conversation.",
    price: "$3,495",
    features: [
      "3 private sessions per week",
      "Custom curriculum",
      "Daily speaking and listening reps",
      "Corrections and progress tracking",
      "Songs, videos, and conversation practice",
    ],
    featured: true,
  },
  {
    key: "intensive",
    label: "Intensive",
    duration: "8 Weeks",
    description: "For serious students who want the fastest transformation.",
    price: "$7,000",
    features: [
      "4 private sessions per week",
      "Daily check-ins",
      "Personalized curriculum",
      "High accountability",
      "Advanced speaking, listening, and memory training",
    ],
    featured: false,
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
    <section id="programs" className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Choose Your Program
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl bg-white p-8 shadow-sm ${
                plan.featured ? "border-2 border-teal-600 shadow-lg" : "border border-slate-200"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                {plan.label}
              </p>
              <h3 className="mt-1 text-xl font-bold">{plan.duration}</h3>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <p className="mt-6 text-4xl font-extrabold text-slate-900">{plan.price}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-teal-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={loading === plan.key}
                className={`mt-8 w-full rounded-xl px-6 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                  plan.featured
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "border border-teal-600 text-teal-700 hover:bg-teal-50"
                }`}
              >
                {loading === plan.key ? "Redirecting…" : "Enroll Now"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
