import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Compass, Handshake, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { LogoMark } from '../components/ui.jsx';
import { SignInButtons } from '../components/auth.jsx';

export default function Login() {
  const { user } = useApp();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  if (user) return <Navigate to={user.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`} replace />;
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center py-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="relative mx-auto w-fit"><LogoMark size={56} /></div>
        <h1 className="relative mt-5 text-3xl font-bold tracking-tight text-slate-900">Campus<span className="text-indigo-600">One</span></h1>
        <p className="relative mt-1.5 text-[15px] text-slate-500">Everything on campus. One intelligent layer.</p>
        <div className="relative mt-8"><SignInButtons returnTo={next} /></div>
        <ul className="relative mt-8 space-y-2.5 text-left text-sm text-slate-600">
          <li className="flex items-center gap-2.5"><Sparkles className="h-4 w-4 text-indigo-500" />Personalised picks ranked by Claude</li>
          <li className="flex items-center gap-2.5"><Handshake className="h-4 w-4 text-indigo-500" />AI Team Builder finds the teammates you need</li>
          <li className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-emerald-500" />Your email is never shown to other students</li>
        </ul>
      </div>
      <Link to="/discover" className="mt-5 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600"><Compass className="h-4 w-4" />Just browsing? Explore campus without signing in</Link>
    </div>
  );
}
