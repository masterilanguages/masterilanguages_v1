"use client";

import { useState } from "react";
import Link from "next/link";

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
];

const LANGUAGES = [
  "Hebrew", "Spanish", "French", "Italian",
  "Portuguese", "Other",
];

export default function BookPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    language: "", date: "", time: "", notes: "",
  });

  const today = new Date();
  today.setDate(today.getDate() + 1);
  const minDate = today.toISOString().split("T")[0];

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    const subject = encodeURIComponent(`Strategy Call Request — ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nLanguage: ${form.language}\nPreferred Date: ${form.date}\nPreferred Time: ${form.time}\nNotes: ${form.notes}`
    );
    window.location.href = `mailto:hello@masterilanguages.com?subject=${subject}&body=${body}`;
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      {/* Header */}
      <div className="mx-auto max-w-xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          ← Back
        </Link>

        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-400">Free · 30 Minutes</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Book Your Strategy Call</h1>
          <p className="mt-2 text-slate-400">
            Tell us a bit about yourself and pick a time.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step > s
                    ? "bg-teal-500 text-white"
                    : step === s
                    ? "bg-teal-600 text-white"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              <span className={`text-sm ${step >= s ? "text-white" : "text-slate-500"}`}>
                {s === 1 ? "About You" : "Pick a Time"}
              </span>
              {s < 2 && <div className="mx-2 h-px w-8 bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5 rounded-2xl bg-slate-900 p-8">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Language you want to learn *</label>
              <select
                required
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="" disabled>Select a language</option>
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Anything you&apos;d like us to know?</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Your level, goals, past experience..."
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <button
              onClick={() => {
                if (!form.name || !form.email || !form.language) return;
                setStep(2);
              }}
              className="w-full rounded-xl bg-teal-600 py-3.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-40"
            >
              Next: Pick a Time →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6 rounded-2xl bg-slate-900 p-8">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Preferred Date *</label>
              <input
                type="date"
                required
                min={minDate}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-300">Preferred Time *</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => set("time", t)}
                    className={`rounded-xl py-2.5 text-xs font-semibold transition ${
                      form.time === t
                        ? "bg-teal-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-slate-700 py-3.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  if (!form.date || !form.time) return;
                  handleSubmit();
                }}
                className="flex-1 rounded-xl bg-teal-600 py-3.5 text-sm font-bold text-white transition hover:bg-teal-500"
              >
                Confirm Call
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirmation */}
        {step === 3 && (
          <div className="rounded-2xl bg-slate-900 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-2xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
            <p className="mt-3 text-slate-400">
              Your request has been sent. We&apos;ll reach out to{" "}
              <span className="text-white">{form.email}</span> to confirm your call.
            </p>
            <div className="mt-6 rounded-xl bg-slate-800 p-4 text-left text-sm text-slate-300">
              <p><span className="text-slate-500">Language:</span> {form.language}</p>
              <p className="mt-1"><span className="text-slate-500">Date:</span> {form.date}</p>
              <p className="mt-1"><span className="text-slate-500">Time:</span> {form.time}</p>
            </div>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
