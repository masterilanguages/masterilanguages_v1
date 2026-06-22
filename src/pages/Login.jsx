import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const reset = () => { setError(null); setInfo(null); };

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setInfo('Check your email for a password reset link.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user && !data.session) {
          setInfo('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    reset();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err?.message || 'Could not sign in with Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-white">
      {/* Top bar */}
      <header className="px-8 py-5 flex items-center">
        <BackpackLogo />
      </header>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">

          {/* Headline block */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {mode === 'forgot'
                ? 'Reset your password'
                : mode === 'signup'
                ? 'Create your account'
                : 'Welcome back'}
            </h1>
            {mode === 'signin' && (
              <>
                <p className="mt-1 text-sm text-slate-500">Continue your language journey.</p>
                <p className="mt-1 text-xs text-slate-400">
                  Build vocabulary. Practice conversations. Learn through real-world content.
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="mt-1 text-sm text-slate-500">Start your language journey today.</p>
            )}
            {mode === 'forgot' && (
              <p className="mt-1 text-sm text-slate-500">We'll send you a link to reset it.</p>
            )}
          </div>

          {/* Google */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-slate-100 flex-1" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
            </>
          )}

          {/* Email / password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'forgot' ? 'Send reset link' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {/* Secondary links */}
          <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
            {mode === 'forgot' ? (
              <button
                onClick={() => { reset(); setMode('signin'); }}
                className="hover:text-slate-900 transition-colors"
              >
                ← Back to sign in
              </button>
            ) : (
              <button
                onClick={() => { reset(); setMode('forgot'); }}
                className="hover:text-slate-900 transition-colors"
              >
                Forgot password?
              </button>
            )}

            {mode !== 'forgot' && (
              <span>
                {mode === 'signup' ? 'Have an account? ' : 'New here? '}
                <button
                  onClick={() => { reset(); setMode(mode === 'signup' ? 'signin' : 'signup'); }}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  {mode === 'signup' ? 'Sign in' : 'Sign up'}
                </button>
              </span>
            )}
          </div>

          {/* Trust signal */}
          <p className="mt-10 text-center text-xs text-slate-400">
            Trusted by language learners and educators worldwide.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-5 text-center">
        <p className="text-xs text-slate-300">Powered by Backpack</p>
      </footer>
    </div>
  );
}

function BackpackLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="6" y="9" width="14" height="14" rx="2.5" stroke="#0f172a" strokeWidth="1.7" />
        <path d="M9.5 9V7.5A3.5 3.5 0 0 1 16.5 7.5V9" stroke="#0f172a" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="6" y1="15" x2="20" y2="15" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="10.5" y="13.5" width="5" height="3" rx="0.75" fill="#0f172a" opacity="0.15" />
        <line x1="11.5" y1="15" x2="14.5" y2="15" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold text-slate-900 tracking-tight">Backpack</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
