import { MapPin, CalendarDays, Sparkles, Check, ArrowUpRight, Wifi } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { CategoryChip, DeadlineBadge } from './ui.jsx';
import { dateParts, formatDate, deadlineInfo } from '../lib/dates.js';
import { matchFor } from '../lib/match.js';
import { useSpotlight } from '../lib/motion.jsx';

/**
 * Event card with three visual tiers (priority / recommended / normal).
 * Hovering reveals "why it matters" in place of the description (always shown on touch).
 */
export default function EventCard({ event, recommendation, style }) {
  const { openEvent, registered, toggleRegister, profile } = useApp();
  const spot = useSpotlight();
  const isReg = registered.includes(event.id);
  const d = dateParts(event.date);
  const dl = deadlineInfo(event.registrationDeadline);
  const m = profile ? matchFor(event, recommendation, profile) : recommendation ? { score: recommendation.score, reason: recommendation.reason, reasons: [] } : null;
  const urgent = dl && (dl.level === 'critical' || dl.level === 'urgent');
  const tier = m && m.score >= 75 && urgent ? 'priority' : m && m.score >= 80 ? 'recommended' : 'normal';
  const why = m?.reason || (m?.reasons?.length ? `Matches your ${m.reasons.slice(0, 3).join(', ').toLowerCase()}.` : null);

  return (
    <article
      style={style}
      onPointerMove={spot}
      className={`spotlight group relative flex flex-col rounded-2xl border bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 ease-out animate-slide-up hover:-translate-y-0.5 hover:shadow-lg ${tier === 'priority' ? 'border-indigo-200' : 'border-slate-200/80 hover:border-slate-300'} shadow-sm`}
    >
      {tier !== 'normal' && (
        <span className={`absolute inset-x-5 top-0 h-[2px] rounded-b-full ${tier === 'priority' ? 'bg-indigo-600' : 'bg-indigo-600/40'} origin-left scale-x-50 transition-transform duration-500 group-hover:scale-x-100`} aria-hidden />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryChip category={event.category} />
          {tier === 'priority' && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Priority</span>}
          {event.source === 'ai' && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"><Sparkles className="h-3 w-3" />New</span>}
        </div>
        {m ? (
          <div className="text-right">
            <div className={`font-display text-xl font-semibold leading-none tabular-nums ${m.score >= 80 ? 'text-indigo-600' : 'text-slate-400'}`}>{m.score}<span className="text-xs">%</span></div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">match</div>
          </div>
        ) : (
          <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-slate-200 py-1 text-center">
            <span className="text-[9px] font-bold tracking-wider text-indigo-600">{d.month}</span>
            <span className="font-display text-base font-semibold leading-none text-slate-900">{d.day}</span>
          </div>
        )}
      </div>

      <h3 className="mt-3.5 text-[16px] font-semibold leading-snug tracking-tight text-slate-900">
        <button onClick={() => openEvent(event.id)} className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {event.title}
        </button>
      </h3>
      <p className="mt-0.5 text-[13px] text-slate-500">{event.organizer}</p>

      {/* description <-> why it matters */}
      <div className="relative mt-3 min-h-[42px] text-sm leading-relaxed">
        <p className={`line-clamp-2 text-slate-600 transition-all duration-300 ${why ? 'group-hover:-translate-y-1 group-hover:opacity-0 [@media(hover:none)]:hidden' : ''}`}>{event.description}</p>
        {why && (
          <p className="absolute inset-0 flex translate-y-1 items-start gap-1.5 text-indigo-900 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
            <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-indigo-500" /><span className="line-clamp-2">{why}</span>
          </p>
        )}
      </div>

      <div className="mt-4 space-y-1.5 text-[13px] text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
        <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric' })}{event.time ? ` · ${event.time}` : ''}</div>
        <div className="flex items-center gap-2 truncate">{event.mode === 'Online' ? <Wifi className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />}<span className="truncate">{event.location || 'Venue TBA'}</span></div>
      </div>

      <div className="min-h-4 flex-1" />
      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        {event.registrationDeadline ? <DeadlineBadge date={event.registrationDeadline} /> : <span className="text-xs font-medium text-slate-400">{event.fee || 'Free'}</span>}
        {event.category === 'Announcement' ? (
          <button onClick={() => openEvent(event.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Read <ArrowUpRight className="h-4 w-4" />
          </button>
        ) : dl?.level === 'closed' ? (
          <span className="text-xs font-medium text-slate-400">Closed</span>
        ) : (
          <button
            onClick={() => toggleRegister(event.id)}
            aria-pressed={isReg}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${isReg ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-slate-900 text-white hover:bg-black'}`}
          >
            {isReg ? <><Check className="h-4 w-4" /> Registered</> : 'Register'}
          </button>
        )}
      </div>
    </article>
  );
}
