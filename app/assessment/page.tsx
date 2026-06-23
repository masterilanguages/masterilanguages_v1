"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Data ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "language",
    title: "What language would you like to learn?",
    options: ["Spanish", "English", "Hebrew", "Portuguese", "French", "Italian", "Other"],
  },
  {
    id: "level",
    title: "What is your current level?",
    options: ["Complete Beginner", "Beginner", "Intermediate", "Advanced"],
  },
  {
    id: "goal",
    title: "What is your primary goal?",
    options: ["Travel", "Work & Career", "Business", "Relationships", "Religious / Cultural", "Fluency", "All of the Above"],
  },
  {
    id: "timeline",
    title: "When would you like to see results?",
    options: ["Within 30 Days", "Within 3 Months", "Within 6 Months", "Within 12 Months"],
  },
  {
    id: "commitment",
    title: "How much time can you dedicate each day?",
    options: ["15 Minutes", "30 Minutes", "1 Hour", "2+ Hours"],
  },
  {
    id: "challenge",
    title: "What is your biggest challenge?",
    options: [
      "Remembering Vocabulary",
      "Speaking Confidently",
      "Understanding Native Speakers",
      "Consistency",
      "Grammar",
      "Other",
    ],
  },
];

// ─── Recommendation engine ────────────────────────────────────────────────────

type Answers = { language: string; level: string; goal: string; timeline: string; commitment: string; challenge: string };

type ProgramKey = "Foundation" | "Kickstart" | "Fluency Accelerator" | "Masteri Accelerator";

const PROGRAMS: Record<ProgramKey, { description: string; reasons: (a: Answers) => string[] }> = {
  Foundation: {
    description: "Build the habit and learn the Masteri system with group coaching and weekly sessions.",
    reasons: (a) => [
      `Starting as a ${a.level.toLowerCase()} is the perfect time to build a strong foundation.`,
      `With ${a.commitment.toLowerCase()} per day, Foundation is designed to fit your schedule.`,
      `Group coaching will keep you accountable and moving forward consistently.`,
    ],
  },
  Kickstart: {
    description: "Private 1:1 coaching 3x per week to start speaking with confidence in 4 weeks.",
    reasons: (a) => [
      `Your goal to learn ${a.language} for ${a.goal.toLowerCase()} needs real conversation practice.`,
      `With results wanted ${a.timeline.toLowerCase()}, Kickstart's pace matches your urgency.`,
      `Private coaching eliminates your challenge with ${a.challenge.toLowerCase()}.`,
    ],
  },
  "Fluency Accelerator": {
    description: "Maximum 1:1 coaching 4x per week for rapid fluency progress over 8 weeks.",
    reasons: (a) => [
      `Your commitment of ${a.commitment.toLowerCase()} per day is ideal for accelerated progress.`,
      `${a.language} fluency for ${a.goal.toLowerCase()} requires intensive speaking practice.`,
      `Four sessions per week will directly address your challenge with ${a.challenge.toLowerCase()}.`,
    ],
  },
  "Masteri Accelerator": {
    description: "12 months of immersive coaching, 5 sessions per week, with full accountability and a personalized roadmap.",
    reasons: (a) => [
      `Your goal of ${a.goal.toLowerCase()} in ${a.language} requires long-term structured coaching.`,
      `With ${a.commitment.toLowerCase()} per day, you have the commitment for real transformation.`,
      `The Masteri Accelerator is built for learners serious about achieving true fluency.`,
    ],
  },
};

function getRecommendation(a: Answers): ProgramKey {
  const isHighCommitment = a.commitment === "1 Hour" || a.commitment === "2+ Hours";
  const isLongTerm = a.timeline === "Within 12 Months" || a.timeline === "Within 6 Months";
  const isProfessional = ["Work & Career", "Business", "Relationships", "Religious / Cultural"].includes(a.goal);
  const isAdvanced = a.level === "Intermediate" || a.level === "Advanced";
  const isUrgent = a.timeline === "Within 30 Days" || a.timeline === "Within 3 Months";
  const isBeginner = a.level === "Complete Beginner" || a.level === "Beginner";
  const isLowCommitment = a.commitment === "15 Minutes" || a.commitment === "30 Minutes";

  if (isHighCommitment && isLongTerm && (isProfessional || a.level === "Advanced")) return "Masteri Accelerator";
  if (isAdvanced && isHighCommitment) return "Fluency Accelerator";
  if (isUrgent || (isHighCommitment && !isLongTerm)) return "Kickstart";
  if (isBeginner && isLowCommitment) return "Foundation";
  if (isBeginner && isUrgent) return "Kickstart";
  return "Kickstart";
}

// ─── Plan → Stripe price key map ─────────────────────────────────────────────

const PLAN_KEYS: Record<ProgramKey, string> = {
  Foundation: "foundation",
  Kickstart: "kickstart",
  "Fluency Accelerator": "fluency",
  "Masteri Accelerator": "accelerator",
};

function EnrollButton({ recommendedProgram }: { recommendedProgram: ProgramKey }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: PLAN_KEYS[recommendedProgram] }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(true);
        setLoading(false);
      }
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="inline-block rounded-xl bg-teal-500 px-8 py-4 text-sm font-bold text-white transition hover:bg-teal-400 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : `Enroll in ${recommendedProgram}`}
      </button>
      {error && (
        <p className="text-xs text-red-400">Something went wrong. Try again or book a consultation.</p>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const [step, setStep] = useState(0); // 0 = contact gate, 1-6 = questions, 7 = results
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill email from sessionStorage (set by newsletter form)
  useEffect(() => {
    const stored = sessionStorage.getItem("masteri_email");
    if (stored) setEmail(stored);
  }, []);

  const currentStep = STEPS[step - 1];
  const totalSteps = STEPS.length;
  const progress = step === 0 ? 0 : Math.round((step / totalSteps) * 100);
  const recommendation = getRecommendation(answers as Answers);
  const program = PROGRAMS[recommendation];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    sessionStorage.setItem("masteri_email", email);
    setStep(1);
  };

  const handleSelect = (option: string) => setSelected(option);

  const handleContinue = () => {
    if (!selected) return;
    const stepId = currentStep.id as keyof Answers;
    const newAnswers = { ...answers, [stepId]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (step === totalSteps) {
      // Submit
      const rec = getRecommendation(newAnswers as Answers);
      setSubmitted(true);
      fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${firstName} ${lastName}`, firstName, lastName, phone, email, ...newAnswers, recommendedProgram: rec }),
      }).catch(console.error);
      setStep(totalSteps + 1);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setSelected(null);
    setStep((s) => Math.max(0, s - 1));
  };

  // ── Contact gate ────────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
        <div className="w-full max-w-md">
          <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300">
            ← Back to Login
          </Link>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-400">Account Activation</p>
          <h1 className="text-3xl font-extrabold text-white">Activate your account to discover the program that's best for you.</h1>
          <form onSubmit={handleContactSubmit} className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none"
              />
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-500 py-4 text-sm font-bold text-white transition hover:bg-teal-400"
            >
              Start My Assessment →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (step === totalSteps + 1) {
    const reasons = program.reasons(answers as Answers);
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <p className="text-4xl">✓</p>
            <h1 className="mt-3 text-2xl font-extrabold">Assessment Complete</h1>
            <p className="mt-2 text-slate-400">
              Based on your responses, we&apos;ve created your personalized fluency recommendation.
            </p>
          </div>

          {/* Result card */}
          <div className="rounded-2xl border border-teal-600 bg-slate-900 p-8">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal-400">Your Recommended Program</p>
            <h2 className="text-3xl font-extrabold text-white">{recommendation}</h2>
            <p className="mt-2 text-slate-400">{program.description}</p>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Why this program fits your goals
              </p>
              <ul className="space-y-3">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                      ✓
                    </span>
                    <span className="text-sm text-slate-300">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(answers).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-900 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 capitalize">{k}</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{v}</p>
              </div>
            ))}
          </div>

          {/* Final CTA */}
          <div className="mt-10 rounded-2xl bg-teal-600/10 border border-teal-600/30 p-8 text-center">
            <h3 className="text-xl font-extrabold text-white">Ready to Start?</h3>
            <p className="mt-2 text-slate-400 text-sm">
              Choose your program and enroll — your login credentials will be sent once your spot is confirmed.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={`/#programs`}
                className="inline-block rounded-xl bg-teal-500 px-8 py-4 text-sm font-bold text-white transition hover:bg-teal-400"
              >
                Choose Your Program →
              </a>
              <a
                href="/book"
                className="inline-block rounded-xl border border-slate-600 px-8 py-4 text-sm font-bold text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                Book Free Consultation
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Questions ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-lg">
        {/* Back */}
        <button
          onClick={handleBack}
          className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          ← Back
        </button>

        {/* Progress */}
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Step {step} of {totalSteps}</span>
          <span>{progress}%</span>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <h2 className="text-2xl font-extrabold tracking-tight">{currentStep.title}</h2>

        {/* Options */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          {currentStep.options.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                selected === option
                  ? "border-teal-500 bg-teal-500/10 text-teal-400"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
              }`}
            >
              <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-xs ${
                selected === option ? "border-teal-500 bg-teal-500 text-white" : "border-slate-600"
              }`}>
                {selected === option ? "✓" : ""}
              </span>
              {option}
            </button>
          ))}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="mt-8 w-full rounded-xl bg-teal-500 py-4 text-sm font-bold text-white transition hover:bg-teal-400 disabled:opacity-30"
        >
          {step === totalSteps ? "See My Results" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
