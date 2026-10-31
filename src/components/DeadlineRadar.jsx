// Deadline Radar: upcoming registration deadlines on a time axis (non-linear: near
// days get more room). Hover/focus a deadline to see urgency, match and actions.
import { useMemo, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { daysUntil, deadlineInfo, formatDate } from '../lib/dates.js';
import { matchFor } from '../lib/match.js';

const HORIZON = 14;
const TICKS = [{ n: 0, label: 'Today' }, { n: 1, label: 'Tomorrow' }, { n: 3, label: '3 days' }, { n: 7, label: '7 days' }, { n: 14, label: '2 weeks' }];
const xOf = (n) => 4 + Math.sqrt(Math.min(n, HORIZON) / HORIZON) * 92; // percent
const DOT = { critical: 'bg-red-500', urgent: 'bg-orange-500', soon: 'bg-amber-500', later: 'bg-slate-400' };
const TXT = { critical: 'text-red-600', urgent: 'text-orange-600', soon: 'text-amber-700', later: 'text-slate-500' };
const BUCKETS = [
  { label: 'Today', test: (n) => n === 0 },
  { label: 'Tomorrow', test: (n) => n === 1 },
  { label: 'Within 3 days', test: (n) => n >= 2 && n <= 3 },
  { label: 'This week', test: (n) => n >= 4 && n <= 7 },
  { label: 'Next week', test: (n) => n >= 8 && n <= HORIZON },
];

function useUpcoming(events, limit) {
  return useMemo(() => events
    .map((e) => ({ e, n: daysUntil(e.registrationDeadline) }))
    .filter((x) => x.n !== null && x.n >= 0 && x.n <= HORIZON && x.e.category !== 'Announcement')
    .sort((a, b) => a.n - b.n)
    .slice(0, limit), [events, limit]);
}

function Detail({ e, n, onClose }) {
  const { openEvent, toggleRegister, registered, recById, profile } = useApp();
  const info = deadlineInfo(e.registrationDeadline);
  const m = profile ? matchFor(e, recById.get(e.id), profile) : null;
  const isReg = registered.includes(e.id);
  return (
    <div className="w-64 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xl" onMouseLeave={onClose}>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${TXT[info.level] || 'text-slate-500'}`}>{n === 0 ? 'Closes today' : n === 1 ? 'Closes tomorrow' : `${n} days left`}</span>
        {m && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">{m.score}% match</span>}
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">{e.title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{e.category} · {e.organizer}</p>
      {m?.reasons.length > 0 && <p className="mt-2 text-xs text-slate-500">{m.reasons.slice(0, 2).join(' · ')}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => openEvent(e.id)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-black">View<ArrowUpRight className="h-3.5 w-3.5" /></button>
        <button onClick={() => toggleRegister(e.id)} className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${isReg ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{isReg ? <><Check className="h-3.5 w-3.5" />Registered</> : 'Register'}</button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Register by {formatDate(e.registrationDeadline, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
    </div>
  );
}

function HorizontalRadar({ items }) {
  const [active, setActive] = useState(null);
  // Assign label lanes above/below the axis so labels don't collide.
  const placed = useMemo(() => {
    const out = [];
    items.forEach((it, i) => {
      const x = xOf(it.n);
      let best = null;
      for (let lane = 0; lane < 3 && !best; lane++) {
        for (const side of i % 2 ? ['bottom', 'top'] : ['top', 'bottom']) {
          if (!out.some((o) => o.side === side && o.lane === lane && Math.abs(o.x - x) < 15)) { best = { side, lane }; break; }
        }
      }
      if (best) out.push({ ...it, x, ...best });
    });
    return out;
  }, [items]);
  const hidden = items.length - placed.length;

  return (
    <div className="relative h-[340px] select-none" onMouseLeave={() => setActive(null)}>
      {/* zones */}
      <div className="absolute inset-y-6 rounded-xl bg-red-500/[0.04]" style={{ left: `${xOf(0) - 2}%`, width: `${xOf(1.5) - xOf(0) + 2}%` }} aria-hidden />
      <div className="absolute inset-y-6 rounded-xl bg-amber-500/[0.04]" style={{ left: `${xOf(1.5)}%`, width: `${xOf(7) - xOf(1.5)}%` }} aria-hidden />
      {/* axis */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" aria-hidden />
      {TICKS.map((t) => (
        <div key={t.n} className="absolute top-1/2 -translate-x-1/2" style={{ left: `${xOf(t.n)}%` }} aria-hidden>
          <div className="mx-auto h-2 w-px -translate-y-1 bg-slate-300" />
          <div className="mt-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t.label}</div>
        </div>
      ))}
      {placed.map((p, i) => {
        const info = deadlineInfo(p.e.registrationDeadline);
        const offset = 46 + p.lane * 42;
        const isActive = active === p.e.id;
        const dim = active && !isActive;
        const align = p.x < 18 ? 'left-0' : p.x > 82 ? 'right-0' : 'left-1/2 -translate-x-1/2';
        return (
          <div key={p.e.id} className="absolute top-1/2" style={{ left: `${p.x}%`, zIndex: isActive ? 20 : 1 }}>
            {/* stem */}
            <div className={`absolute left-0 w-px origin-top transition-colors ${isActive ? 'bg-slate-900' : 'bg-slate-200'}`} style={p.side === 'top' ? { bottom: 0, height: offset - 12 } : { top: 0, height: offset - 12 }} aria-hidden />
            {/* dot */}
            <span className={`absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full ring-4 ring-paper transition-transform duration-300 ${DOT[info.level] || 'bg-slate-400'} ${isActive ? 'scale-150' : ''}`} aria-hidden />
            {/* label */}
            <div className={`absolute ${align}`} style={p.side === 'top' ? { bottom: offset - 12 } : { top: offset - 12 }}>
              <button
                onMouseEnter={() => setActive(p.e.id)} onFocus={() => setActive(p.e.id)} onClick={() => setActive(isActive ? null : p.e.id)}
                aria-expanded={isActive}
                style={{ animationDelay: `${i * 45}ms` }}
                className={`block max-w-[150px] truncate rounded-lg border bg-white px-2.5 py-1 text-[12px] font-medium shadow-sm transition-all duration-200 animate-fade-in ${isActive ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'} ${dim ? 'opacity-40' : ''}`}>
                {p.e.title}
              </button>
              {isActive && (
                <div className={`absolute ${p.side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${p.x < 18 ? 'left-0' : p.x > 82 ? 'right-0' : 'left-1/2 -translate-x-1/2'} animate-scale-in`}>
                  <Detail e={p.e} n={p.n} onClose={() => setActive(null)} />
                </div>
              )}
            </div>
          </div>
        );
      })}
      {hidden > 0 && <p className="absolute bottom-0 right-0 text-xs text-slate-400">+{hidden} more in the next two weeks</p>}
    </div>
  );
}

function VerticalRadar({ items }) {
  const [open, setOpen] = useState(null);
  const groups = BUCKETS.map((b) => ({ ...b, items: items.filter((x) => b.test(x.n)) })).filter((g) => g.items.length);
  return (
    <ol className="relative ml-2 border-l border-slate-200">
      {groups.map((g) => (
        <li key={g.label} className="mb-5 last:mb-0">
          <div className="-ml-[5px] flex items-center gap-3">
            <span className={`h-[9px] w-[9px] rounded-full ring-4 ring-paper ${g.label === 'Today' || g.label === 'Tomorrow' ? 'bg-red-500' : g.label === 'Within 3 days' ? 'bg-orange-500' : 'bg-slate-400'}`} />
            <span className="eyebrow">{g.label}</span>
          </div>
          <ul className="mt-2 space-y-2 pl-5">
            {g.items.map(({ e, n }) => (
              <li key={e.id}>
                <button onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id} className="flex w-full items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm">
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className={`shrink-0 text-xs font-semibold ${TXT[deadlineInfo(e.registrationDeadline).level]}`}>{n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n}d`}</span>
                </button>
                <div className={`expand ${open === e.id ? 'open' : ''}`}><div><div className="pt-2 [&>div]:w-full"><Detail e={e} n={n} onClose={() => {}} /></div></div></div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export default function DeadlineRadar({ limit = 12 }) {
  const { events } = useApp();
  const items = useUpcoming(events, limit);
  if (!items.length) return <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No registrations close in the next two weeks.</p>;
  return (
    <>
      <div className="hidden md:block"><HorizontalRadar items={items} /></div>
      <div className="md:hidden"><VerticalRadar items={items} /></div>
    </>
  );
}
