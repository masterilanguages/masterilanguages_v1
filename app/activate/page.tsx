"use client";

import { useState } from "react";
import Link from "next/link";

export default function ActivatePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/activate-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
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
          Enter the email address you used when enrolling. We'll verify your enrollment and send you activation instructions.
        </p>

        {!sent ? (
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
              disabled={loading}
              className="w-full rounded-xl bg-teal-500 py-4 text-sm font-bold text-white transition hover:bg-teal-400 disabled:opacity-60"
            >
              {loading ? "Checking…" : "Send Activation Link"}
            </button>
            <p className="text-center text-sm text-slate-500">
              Not enrolled yet?{" "}
              <Link href="/assessment" className="text-teal-400 hover:text-teal-300 font-medium">
                Start your free assessment →
              </Link>
            </p>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-700 px-6 py-6">
              <p className="font-semibold text-white">✓ Request received</p>
              <p className="mt-2 text-sm text-slate-400">
                If your enrollment is confirmed, you'll receive an activation email shortly with instructions to set your password and access your student portal.
              </p>
            </div>
            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300">
                ← Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
