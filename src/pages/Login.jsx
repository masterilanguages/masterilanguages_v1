import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';

// Recreates Base44's former hosted login screen, now backed by Supabase Auth.
// Modes: 'signin' | 'signup' | 'forgot'.
export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const reset = () => {
    setError(null);
    setInfo(null);
  };

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
        setInfo('Revisa tu correo: te enviamos un enlace para restablecer la contraseña.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user && !data.session) {
          setInfo('Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.');
          setMode('signin');
        }
        // If email confirmation is OFF, a session is returned and AuthContext
        // picks it up automatically via onAuthStateChange.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Success: AuthContext's onAuthStateChange swaps to the app.
      }
    } catch (err) {
      setError(err?.message || 'Algo salió mal. Intenta de nuevo.');
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
        options: { redirectTo: `${window.location.origin}/Home` },
      });
      if (error) throw error;
      // Browser redirects to Google.
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar con Google.');
      setLoading(false);
    }
  };

  const title = 'Welcome to Language Masteri';
  const subtitle =
    mode === 'forgot' ? 'Restablece tu contraseña'
    : mode === 'signup' ? 'Crea tu cuenta'
    : 'Sign in to continue';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 px-8 py-10">
        {/* Logo — swap the placeholder for the real LanguageMasteri logo when available */}
        <div className="mx-auto w-20 h-20 rounded-full bg-white shadow-md ring-1 ring-slate-100 flex items-center justify-center">
          <span className="text-2xl font-extrabold tracking-tight text-amber-600">LM</span>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-center text-slate-900 leading-tight">
          {title}
        </h1>
        <p className="text-center text-slate-500 mt-1">{subtitle}</p>

        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full mt-6 flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs font-medium text-slate-400">OR</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
          </>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 text-center">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 text-center">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-lg py-3 font-semibold hover:bg-slate-800 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'forgot' ? 'Enviar enlace' : mode === 'signup' ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-5 text-sm">
          {mode === 'forgot' ? (
            <button onClick={() => { reset(); setMode('signin'); }} className="font-semibold text-slate-700 hover:text-slate-900">
              ← Volver
            </button>
          ) : (
            <button onClick={() => { reset(); setMode('forgot'); }} className="font-semibold text-slate-700 hover:text-slate-900">
              Forgot password?
            </button>
          )}

          {mode !== 'forgot' && (
            <span className="text-slate-500">
              {mode === 'signup' ? 'Already have an account? ' : 'Need an account? '}
              <button
                onClick={() => { reset(); setMode(mode === 'signup' ? 'signin' : 'signup'); }}
                className="font-semibold text-slate-900 hover:underline"
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
