"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "loading" | "sent" | "not_enrolled";

export default function ActivatePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/auth/activate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setStatus(data.status === "sent" ? "sent" : "not_enrolled");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300">
          ← Back to Login
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-400">Account Activation</p>
        <h1 className="text-3xl font-extrabold text-white">Activate your account.</h1>
        <p className="mt-3 text-slate-400">
          Enter the email address you used when enrolling. We'll verify your enrollment and send you your login details.
        </p>

        {status === "idle" || status === "loading" ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your enrollment email"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl bg-teal-500 py-4 text-sm font-bold text-white transition hover:bg-teal-400 disabled:opacity-60"
            >
              {status === "loading" ? "Verifying enrollment…" : "Send Activation Link"}
            </button>
            <p className="text-center text-sm text-slate-500">
              Not enrolled yet?{" "}
              <Link href="/get-started" className="text-teal-400 hover:text-teal-300 font-medium">
                View programs →
              </Link>
            </p>
          </form>
        ) : status === "sent" ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-teal-600/40 bg-teal-600/10 px-6 py-6">
              <p className="font-bold text-white">✓ Activation email sent</p>
              <p className="mt-2 text-sm text-slate-300">
                Your enrollment has been verified. Check your inbox at <span className="font-medium text-white">{email}</span> — you'll receive instructions to set your password and access your student portal.
              </p>
            </div>
            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300">
                ← Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-6">
              <p className="font-bold text-white">No enrollment found</p>
              <p className="mt-2 text-sm text-slate-400">
                We couldn't find an active enrollment for <span className="font-medium text-white">{email}</span>. You'll need to enroll in a program before you can activate your account.
              </p>
            </div>
            <a
              href="/#programs"
              className="block w-full rounded-xl bg-teal-500 py-4 text-center text-sm font-bold text-white transition hover:bg-teal-400"
            >
              View Programs →
            </a>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-sm text-slate-500 hover:text-slate-300"
              >
                ← Try a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
