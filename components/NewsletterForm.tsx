"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="text-sm font-medium text-teal-400">
        ✓ You&apos;re in! We&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60"
      >
        {state === "loading" ? "Sending…" : "Get Instant Access"}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-400 sm:col-span-2">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
