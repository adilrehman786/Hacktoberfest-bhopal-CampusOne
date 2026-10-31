import { useEffect, useState } from 'react';
import { Users, Sparkles, X, ShieldCheck, LoaderCircle } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { LogoMark } from './ui.jsx';
import { useScrollLock } from '../lib/scrollLock.js';

export function GoogleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** "Continue with Google" + (local only) demo sign-in fallback. */
export function SignInButtons({ returnTo, className = '' }) {
  const { providers, signIn, demoSignIn, toast } = useApp();
  const [busy, setBusy] = useState(null);
  const google = async () => {
    setBusy('google');
    try { await signIn(returnTo); } catch (err) { toast(err.message, 'error'); setBusy(null); }
  };
  const demo = async () => {
    setBusy('demo');
    try { await demoSignIn(); } catch (err) { toast(err.message || 'Sign-in failed', 'error'); } finally { setBusy(null); }
  };
  return (
    <div className={`space-y-3 ${className}`}>
      <button
        type="button"
        onClick={google}
        disabled={!providers.google || busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-[15px] font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
      >
        {busy === 'google' ? <LoaderCircle className="h-5 w-5 animate-spin text-slate-500" /> : <GoogleIcon />}
        Continue with Google
      </button>
      {!providers.google && (
        <p className="text-center text-xs text-slate-400">Google sign-in isn't configured on this server yet (set <code className="font-mono">GOOGLE_CLIENT_ID</code>).</p>
      )}
      {!providers.google && providers.demo && (
        <button type="button" onClick={demo} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:opacity-60">
          {busy === 'demo' && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Continue as demo student (local only)
        </button>
      )}
    </div>
  );
}

export function AuthModal() {
  const { authPrompt, closeAuthPrompt, user } = useApp();
  useScrollLock(Boolean(authPrompt));
  useEffect(() => {
    if (!authPrompt) return;
    const onKey = (e) => e.key === 'Escape' && closeAuthPrompt();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [authPrompt, closeAuthPrompt]);
  useEffect(() => { if (user && authPrompt) closeAuthPrompt(); }, [user, authPrompt, closeAuthPrompt]);
  if (!authPrompt) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-fade-in" onClick={closeAuthPrompt} />
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-scale-in sm:rounded-3xl">
        <div className="relative overflow-hidden bg-slate-900 px-7 pb-8 pt-7 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.25) 1px, transparent 0)', backgroundSize: '18px 18px', maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }} />
          <button onClick={closeAuthPrompt} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center gap-3">
            <LogoMark size={44} />
            <div className="flex -space-x-2">
              {['from-amber-300 to-orange-400', 'from-sky-300 to-indigo-400', 'from-emerald-300 to-teal-400'].map((g, i) => (
                <div key={g} className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${g} ring-2 ring-slate-900`}>
                  {i === 1 ? <Users className="h-4 w-4 text-white" /> : <Sparkles className="h-3.5 w-3.5 text-white" />}
                </div>
              ))}
            </div>
          </div>
          <h2 id="auth-title" className="relative mt-5 text-2xl font-bold tracking-tight">Join CampusOne</h2>
          <p className="relative mt-1.5 text-[15px] leading-relaxed text-slate-300">
            {authPrompt.reason || 'Sign in to personalise your campus experience and find teammates for your next project.'}
          </p>
        </div>
        <div className="px-7 pb-7 pt-6">
          <SignInButtons returnTo={authPrompt.returnTo} />
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            We only use your name, email and profile photo. Your email is never shown to other students.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Wrap a page that needs a signed-in student. Shows an inline gate, not a blank login page. */
export function RequireAuth({ children, title = 'Sign in to continue', text, icon: Icon = Users }) {
  const { user, authLoading, requireAuth } = useApp();
  if (authLoading) {
    return <div className="mx-auto max-w-3xl space-y-4 pt-4"><div className="skeleton h-8 w-1/2" /><div className="skeleton h-4 w-2/3" /><div className="skeleton mt-6 h-48 w-full" /></div>;
  }
  if (user) return children;
  return (
    <div className="mx-auto max-w-xl pt-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e3e3de 1px, transparent 0)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(ellipse at top, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at top, black, transparent 70%)' }} />
        <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white shadow-lg"><Icon className="h-7 w-7" /></div>
        <h1 className="relative mt-5 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="relative mx-auto mt-2 max-w-sm text-[15px] text-slate-500">{text || 'Sign in to personalise your campus experience and find teammates for your next project.'}</p>
        <div className="relative mx-auto mt-6 max-w-xs">
          <SignInButtons />
        </div>
        <button onClick={() => requireAuth(null)} className="sr-only">Open sign-in dialog</button>
      </div>
    </div>
  );
}

const AVATAR_GRADIENTS = ['from-amber-300 to-orange-400', 'from-sky-400 to-indigo-500', 'from-emerald-300 to-teal-500', 'from-fuchsia-400 to-violet-500', 'from-rose-300 to-pink-500', 'from-lime-300 to-emerald-500'];

export function Avatar({ name = '', src, size = 40, className = '' }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'S';
  const grad = AVATAR_GRADIENTS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length];
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src && !broken) {
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={style} className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`} />;
  }
  return <div style={style} className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white ${grad} ${className}`} aria-hidden>{initials}</div>;
}
