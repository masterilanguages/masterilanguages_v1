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

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setInfo('Check your email for a reset link.');
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Masteri Languages</h1>
          <p className="mt-1 text-xs text-slate-400">Powered by Backpack &nbsp;·&nbsp; Your language learning system.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode !== 'forgot' ? (
            <>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
              />
            </>
          ) : (
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          {info && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
          </button>
        </form>

        {/* Footer link */}
        <div className="mt-5 text-center">
          {mode === 'forgot' ? (
            <button
              onClick={() => { setError(null); setInfo(null); setMode('signin'); }}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              ← Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => { setError(null); setInfo(null); setMode('forgot'); }}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              Forgot Password?
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
