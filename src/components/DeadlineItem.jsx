import { ChevronRight, Flame } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { catMeta } from '../lib/categories.js';
import { deadlineInfo, formatDate } from '../lib/dates.js';

const BAR = { critical: 'bg-red-500', urgent: 'bg-orange-400', soon: 'bg-amber-400', later: 'bg-slate-300', closed: 'bg-slate-200' };
const TEXT = { critical: 'text-red-600', urgent: 'text-orange-600', soon: 'text-amber-600', later: 'text-slate-500', closed: 'text-slate-400' };

export default function DeadlineItem({ event, style }) {
  const { openEvent, registered } = useApp();
  const info = deadlineInfo(event.registrationDeadline);
  const m = catMeta(event.category);
  const Icon = m.icon;
  const pct = info ? Math.max(6, Math.min(100, 100 - (info.n / 14) * 100)) : 0;
  return (
    <button
      onClick={() => openEvent(event.id)}
      style={style}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-md animate-slide-up"
    >
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${m.soft}`}><Icon className="h-5 w-5" aria-hidden /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-slate-900 group-hover:text-indigo-700">{event.title}</h3>
          {registered.includes(event.id) && <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:inline">REGISTERED</span>}
        </div>
        <p className={`mt-0.5 text-sm font-medium ${TEXT[info?.level || "later"]}`}>
          {info?.level === "critical" && <Flame className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />}
          {info?.text} <span className="whitespace-nowrap font-normal text-slate-400">· {formatDate(event.registrationDeadline, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </p>
        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className={`h-full rounded-full ${BAR[info?.level || 'later']}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </button>
  );
}
