// Profile identity panels: Campus Profile Strength + Opportunity Fit + activity.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, UsersRound, CalendarCheck, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { explainMatch } from '../lib/match.js';
import { daysUntil } from '../lib/dates.js';
import { MatchRing } from './ui.jsx';

const CHECKS = [
  { id: 'photo', label: 'Profile photo', test: (u) => Boolean(u.picture) },
  { id: 'headline', label: 'Headline', test: (u) => Boolean(u.headline) },
  { id: 'skills', label: '3+ skills', test: (u) => (u.skills || []).length >= 3 },
  { id: 'interests', label: '2+ interests', test: (u) => (u.interests || []).length >= 2 },
  { id: 'goals', label: 'Goals', test: (u) => (u.goals || []).length > 0 },
  { id: 'availability', label: 'Availability', test: (u) => (u.availability || []).length > 0 },
  { id: 'projects', label: 'A project', test: (u) => (u.projects || []).length > 0 },
  { id: 'hackathons', label: 'Hackathon history', test: (u) => (u.hackathons || []).length > 0 },
];

export default function ProfileInsights({ onEdit }) {
  const { user, events, profile, registered, openEvent } = useApp();
  const [teams, setTeams] = useState(null);
  useEffect(() => { api.myTeams().then((d) => setTeams(d.teams.length)).catch(() => setTeams(0)); }, []);

  const checks = CHECKS.map((c) => ({ ...c, done: c.test(user) }));
  const strength = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);

  const fit = useMemo(() => {
    const open = events.filter((e) => { const n = daysUntil(e.registrationDeadline); return e.category !== 'Announcement' && (n === null || n >= 0); });
    const scored = open.map((e) => ({ e, s: explainMatch(e, profile || {}).score })).sort((a, b) => b.s - a.s);
    const strong = scored.filter((x) => x.s >= 75);
    const byCat = strong.reduce((acc, x) => ({ ...acc, [x.e.category]: (acc[x.e.category] || 0) + 1 }), {});
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { strong: strong.length, total: open.length, cats, max: Math.max(1, ...cats.map((c) => c[1])), top: scored.slice(0, 3) };
  }, [events, profile]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
      <section className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Campus profile strength</p>
            <p className="mt-2 text-sm text-slate-500">{strength >= 85 ? 'Strong profile. Teammates can see exactly what you bring.' : 'A fuller profile means sharper matches and better teammates.'}</p>
          </div>
          <MatchRing value={strength} size={64} stroke={5} />
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
          {checks.map((c) => (
            <li key={c.id}>
              {c.done ? (
                <span className="flex items-center gap-2 text-sm text-slate-600"><Check className="h-4 w-4 text-emerald-500" />{c.label}</span>
              ) : (
                <button onClick={c.id === 'photo' ? undefined : onEdit} disabled={c.id === 'photo'} title={c.id === 'photo' ? 'Comes from your Google account' : undefined} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 disabled:hover:text-slate-400"><Plus className="h-4 w-4" />{c.label}</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Opportunity fit</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-slate-900">{fit.strong}<span className="text-base font-medium text-slate-400"> / {fit.total} open listings</span></p>
            <p className="text-sm text-slate-500">are a strong fit (75%+) for your profile right now.</p>
          </div>
        </div>
        {fit.cats.length > 0 && (
          <div className="mt-4 space-y-2">
            {fit.cats.map(([cat, n]) => (
              <div key={cat} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-slate-600">{cat}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-indigo-600" style={{ width: `${(n / fit.max) * 100}%`, transition: 'width .8s cubic-bezier(.16,1,.3,1)' }} /></span>
                <span className="w-5 text-right tabular-nums text-slate-500">{n}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="eyebrow mb-2">Best fits</p>
          {fit.top.map(({ e, s }) => (
            <button key={e.id} onClick={() => openEvent(e.id)} className="group flex w-full items-center gap-3 py-1.5 text-left text-sm">
              <span className="w-9 font-display font-semibold tabular-nums text-indigo-600">{s}%</span>
              <span className="min-w-0 flex-1 truncate text-slate-700 group-hover:text-slate-900">{e.title}</span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600" />
            </button>
          ))}
        </div>
      </section>

      <section className="surface grid min-w-0 grid-cols-3 divide-x divide-slate-100 lg:col-span-2">
        <Link to="/deadlines" className="p-5 transition hover:bg-slate-50">
          <CalendarCheck className="h-4 w-4 text-slate-400" />
          <div className="mt-2 font-display text-2xl font-semibold tabular-nums">{registered.length}</div>
          <div className="text-xs text-slate-500">Opportunities joined</div>
        </Link>
        <Link to="/team/mine" className="p-5 transition hover:bg-slate-50">
          <UsersRound className="h-4 w-4 text-slate-400" />
          <div className="mt-2 font-display text-2xl font-semibold tabular-nums">{teams ?? '–'}</div>
          <div className="text-xs text-slate-500">Teams</div>
        </Link>
        <button onClick={onEdit} className="p-5 text-left transition hover:bg-slate-50">
          {user.discoverable !== false ? <Eye className="h-4 w-4 text-slate-400" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
          <div className="mt-2 text-sm font-semibold text-slate-900">{user.discoverable !== false ? 'Discoverable' : 'Hidden'}</div>
          <div className="text-xs text-slate-500">AI match preferences{(user.availability || []).length ? ` · ${user.availability.join(', ')}` : ''}</div>
        </button>
      </section>
    </div>
  );
}
