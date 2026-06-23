"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <input
        type="text"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-[#1B2B4B] py-4 text-base font-bold text-white transition hover:bg-[#162240] disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
      <div className="text-center">
        <button type="button" className="text-sm text-slate-500 hover:text-slate-700">
          Forgot Password?
        </button>
      </div>
    </form>
  );
}


export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">

        {/* School name */}
        <div className="mb-2 text-center">
          <h1 className="text-4xl font-extrabold text-[#1B2B4B] tracking-tight">
            Masteri Languages
          </h1>
        </div>

        {/* Powered by Backpack */}
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm mt-2">
          <span>Powered by</span>
          <img src="/backpack-icon.svg" alt="Backpack" width={28} height={28} />
          <span className="text-base font-extrabold text-[#1B2B4B] tracking-tight leading-none">Backpack</span>
          <span className="mx-0.5">·</span>
          <span className="italic">Your language learning system.</span>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        {/* Divider */}
        <div className="my-8 border-t border-slate-100" />

        {/* New student CTA */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">New Student?</p>
          <a
            href="/assessment"
            className="block w-full rounded-2xl border border-slate-200 px-5 py-4 text-base font-bold text-[#1B2B4B] transition hover:border-[#1B2B4B] hover:bg-slate-50"
          >
            Take the Free Language Assessment →
          </a>
          <p className="mt-3 text-xs text-slate-400">
            Complete the assessment · Get your fluency roadmap · Enroll · Receive your login credentials
          </p>
        </div>
      </div>
    </div>
  );
}
