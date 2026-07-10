"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/api/supabaseClient";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/portal/schedule";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1) Real Supabase auth (students). Creating the JWT session here is what
    //    lets RLS-protected data load in the portal — without it every query
    //    runs anonymously and comes back empty.
    const { error: sbError } = await supabase.auth.signInWithPassword({ email, password });
    if (!sbError) {
      // AuthContext's onAuthStateChange picks up SIGNED_IN; go to the portal.
      router.push(from);
      return;
    }

    // 2) Fallback: legacy hardcoded admin/demo login (no Supabase account).
    //    Keeps the existing admin flow working untouched.
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(data.redirectTo ?? from);
      return;
    }

    setError("Invalid email or password.");
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });
    setForgotLoading(false);
    setForgotSent(true);
  };

  return (
    <div className="mt-8 space-y-4">
      {!forgotOpen ? (
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Forgot Password?
            </button>
            <span className="text-slate-300">·</span>
            <a href="/activate" className="text-sm text-slate-500 hover:text-slate-700">
              Activate Account
            </a>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {!forgotSent ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-700">Reset your password</p>
                <p className="text-xs text-slate-400">Enter your email and we'll send you access instructions.</p>
              </div>
              <input
                type="email"
                required
                autoFocus
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-2xl bg-[#1B2B4B] py-4 text-base font-bold text-white transition hover:bg-[#162240] disabled:opacity-60"
              >
                {forgotLoading ? "Sending…" : "Send Reset Request"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl bg-slate-50 px-5 py-6">
                <p className="text-sm font-semibold text-slate-700">✓ Password Reset Sent</p>
                <p className="mt-1 text-xs text-slate-400">
                  If an account exists for this email address, you'll receive instructions shortly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setForgotOpen(false); setForgotSent(false); setForgotEmail(""); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
        <div className="flex items-center justify-center gap-1 text-slate-300 text-xs mt-2">
          <span>Powered by</span>
          <img src="/backpack-icon.svg" alt="Backpack" width={22} height={22} style={{ opacity: 0.6 }} />
          <span className="text-xs font-bold text-slate-400 tracking-tight">Backpack</span>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

      </div>
    </div>
  );
}
