import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CalendarRange, Clock3, BellRing, Sparkles, PartyPopper } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { daysUntil } from '../lib/dates.js';
import DeadlineItem from '../components/DeadlineItem.jsx';
import DeadlineRadar from '../components/DeadlineRadar.jsx';
import { PageHeader, EmptyState, AIBadge } from '../components/ui.jsx';

const TABS = [
  { id: 'all', label: 'All upcoming', test: (n) => n >= 0 },
  { id: 'today', label: 'Today & tomorrow', test: (n) => n <= 1 },
  { id: 'week', label: 'This week', test: (n) => n <= 7 },
  { id: 'later', label: 'Later', test: (n) => n > 7 },
];

export default function Deadlines() {
  const { events, registered } = useApp();
  const [tab, setTab] = useState('all');
  const [mine, setMine] = useState(false);

  const upcoming = useMemo(
    () => events
      .map((e) => ({ e, n: daysUntil(e.registrationDeadline) }))
      .filter((x) => x.n !== null && x.n >= 0)
      .sort((a, b) => a.n - b.n),
    [events],
  );
  const list = upcoming.filter((x) => TABS.find((t) => t.id === tab).test(x.n) && (!mine || registered.includes(x.e.id)));

  const stats = [
    { label: 'Closing in 48h', value: upcoming.filter((x) => x.n <= 1).length, icon: Flame, color: 'text-red-600 bg-red-50' },
    { label: 'This week', value: upcoming.filter((x) => x.n <= 7).length, icon: CalendarRange, color: 'text-amber-600 bg-amber-50' },
    { label: 'Later', value: upcoming.filter((x) => x.n > 7).length, icon: Clock3, color: 'text-slate-600 bg-slate-100' },
  ];

  const groups = [
    { title: 'Closing soon', items: list.filter((x) => x.n <= 1) },
    { title: 'This week', items: list.filter((x) => x.n > 1 && x.n <= 7) },
    { title: 'Later', items: list.filter((x) => x.n > 7) },
  ].filter((g) => g.items.length);

  return (
    <div>
      <PageHeader
        eyebrow="Deadline intelligence"
        title={<>Never miss <span className="serif-accent text-indigo-600">the window.</span></>}
        subtitle="Students rarely miss opportunities because they don't exist. They miss them because they forget. Not anymore."
      />

      <section className="surface mb-6 px-4 py-6 sm:px-6">
        <p className="eyebrow mb-4">Radar · next two weeks</p>
        <DeadlineRadar limit={14} />
      </section>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="surface p-4">
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${color}`}><Icon className="h-4.5 w-4.5" /></div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
            <div className="text-xs font-medium text-slate-500 sm:text-sm">{label}</div>
          </div>
        ))}
      </div>

      <Link to="/ask" state={{ q: 'Which registrations close this week? Give me a plan so I don\'t miss any.' }}
        className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-900 p-4 text-white transition hover:bg-black">
        <BellRing className="h-5 w-5 shrink-0 text-indigo-300" />
        <span className="flex-1 text-sm font-medium">Ask Claude to build a deadline plan for your week</span>
        <AIBadge>Ask</AIBadge>
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Deadline range">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
          Only my registrations
        </label>
      </div>

      <div className="mt-5 space-y-7">
        {groups.length ? groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">{g.title}</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {g.items.map(({ e }, i) => <DeadlineItem key={e.id} event={e} style={{ animationDelay: `${i * 40}ms` }} />)}
            </div>
          </section>
        )) : (
          <EmptyState icon={mine ? Sparkles : PartyPopper} title={mine ? 'No registrations here yet' : "You're all caught up"} text={mine ? 'Register for events and their deadlines will appear here.' : 'No deadlines in this range.'} />
        )}
      </div>
    </div>
  );
}
