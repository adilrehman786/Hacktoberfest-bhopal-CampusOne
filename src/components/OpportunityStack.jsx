// Signature component: ranked opportunities that expand to explain the match.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ArrowUpRight, Handshake, Sparkles } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { matchFor } from '../lib/match.js';
import { deadlineInfo, formatDate } from '../lib/dates.js';
import { useSpotlight } from '../lib/motion.jsx';
import { MatchRing } from './ui.jsx';

const URGENCY_TEXT = { critical: 'text-red-600', urgent: 'text-orange-600', soon: 'text-amber-700', later: 'text-slate-500', closed: 'text-slate-400' };

export function OpportunityCard({ event, rec, open, onToggle, index = 0 }) {
  const { profile, openEvent, toggleRegister, registered, requireAuth } = useApp();
  const navigate = useNavigate();
  const spot = useSpotlight();
  const m = matchFor(event, rec, profile || {});
  const dl = deadlineInfo(event.registrationDeadline);
  const isReg = registered.includes(event.id);
  const teamEvent = ['Hackathon', 'Competition'].includes(event.category) && !/^individual/i.test(event.teamSize || '');
  const id = `opp-${event.id}`;

  return (
    <article onPointerMove={spot} style={{ animationDelay: `${index * 60}ms` }}
      className={`spotlight group relative rounded-2xl border bg-white transition-[border-color,box-shadow,transform] duration-300 animate-slide-up ${open ? 'border-slate-300 shadow-lg' : 'border-slate-200/80 shadow-sm hover:-translate-y-px hover:border-slate-300 hover:shadow-md'}`}>
      {/* accent rail tracks match strength */}
      <span className="absolute left-0 top-5 w-[3px] rounded-r-full bg-indigo-600 transition-all duration-500" style={{ height: open ? 'calc(100% - 40px)' : `${Math.max(12, (m.score - 40) * 0.6)}px`, opacity: m.score >= 80 ? 1 : 0.35 }} aria-hidden />
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
        <MatchRing value={m.score} size={52} stroke={4} muted={m.score < 70} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <span className="text-indigo-600">{m.score}% match</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">{event.category}</span>
          </div>
          <h3 className="mt-1 truncate text-[16px] font-semibold tracking-tight text-slate-900 sm:text-[17px]">{event.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{m.reason ? `“${m.reason}”` : m.reasons.length ? `Matches your ${m.reasons.slice(0, 2).join(' and ').toLowerCase()}` : event.organizer}</p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <div className="eyebrow !text-[10px]">Registration closes</div>
          <div className={`mt-0.5 text-sm font-semibold ${URGENCY_TEXT[dl?.level || 'later']}`}>{dl ? (dl.n === 0 ? 'Today' : dl.n === 1 ? 'Tomorrow' : dl.level === 'closed' ? 'Closed' : `In ${dl.n} days`) : 'Open'}</div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div id={id} className={`expand ${open ? 'open' : ''}`}>
        <div>
          <div className="grid gap-5 border-t border-slate-100 px-4 pb-5 pt-4 sm:grid-cols-[1fr_auto] sm:px-5">
            <div>
              <p className="eyebrow">Why this matches you</p>
              {m.reasons.length ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {m.reasons.map((r, i) => (
                    <li key={r} className="flex items-center gap-2 text-sm text-slate-700" style={{ transition: 'opacity .3s, transform .3s', transitionDelay: open ? `${80 + i * 50}ms` : '0ms', opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(4px)' }}>
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-50 text-indigo-600"><Check className="h-3 w-3" strokeWidth={3} /></span>{r}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-slate-500">Outside your usual interests. Add more interests or skills to your profile for sharper matches.</p>}
              {m.source === 'claude' && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Sparkles className="h-3 w-3" />Ranked by Claude from your profile</p>}
              <p className="mt-3 text-xs text-slate-400">{formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric' })}{event.time ? ` · ${event.time}` : ''} · {event.location || 'Venue TBA'}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-stretch">
              <button onClick={() => openEvent(event.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-black">Details<ArrowUpRight className="h-4 w-4" /></button>
              {dl?.level !== 'closed' && event.category !== 'Announcement' && (
                <button onClick={() => toggleRegister(event.id)} className={`rounded-lg px-3.5 py-2 text-sm font-semibold ring-1 ring-inset ${isReg ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{isReg ? 'Registered' : 'Register'}</button>
              )}
              {teamEvent && (
                <button onClick={() => requireAuth(() => navigate(`/team?event=${event.id}`), { returnTo: `/team?event=${event.id}` })} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Handshake className="h-4 w-4" />Teammates</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** items: [{ event, rec }] */
export default function OpportunityStack({ items }) {
  const [open, setOpen] = useState(items[0]?.event.id || null);
  return (
    <div className="space-y-3">
      {items.map(({ event, rec }, i) => (
        <OpportunityCard key={event.id} event={event} rec={rec} index={i} open={open === event.id} onToggle={() => setOpen((o) => (o === event.id ? null : event.id))} />
      ))}
    </div>
  );
}
