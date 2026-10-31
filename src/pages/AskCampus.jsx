import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles, RotateCcw, AlertCircle, ShieldCheck, ArrowUpRight, Target, AlarmClock, Briefcase, ChevronDown, Check } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { Markdown } from '../lib/markdown.jsx';
import { catMeta } from '../lib/categories.js';
import { formatDate, deadlineInfo } from '../lib/dates.js';
import { DeadlineBadge } from '../components/ui.jsx';

const SUGGESTIONS = [
  'Which registrations close this week?',
  "I'm into AI and hackathons. What should I attend this month?",
  'What opportunities are free?',
  'Are there any paid internships open right now?',
  'Give me a plan for this weekend',
  'Is there a quantum computing club?',
];

const STAGES = ['Reading campus listings', 'Matching your interests', 'Writing your answer'];
const BRIEF_STAGES = ['Understanding campus data', 'Matching your interests', 'Building your plan'];

const KINDS = {
  match: { label: 'match your goals', one: 'matches your goals', icon: Target, tone: 'text-indigo-600 bg-indigo-50' },
  deadline: { label: 'deadlines need attention', one: 'deadline needs attention', icon: AlarmClock, tone: 'text-red-600 bg-red-50' },
  portfolio: { label: 'could build your portfolio', one: 'could build your portfolio', icon: Briefcase, tone: 'text-slate-700 bg-slate-100' },
};

/** Stage indicator for a request in flight. Advances while waiting; never adds delay. */
function Thinking({ stages, count }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, stages.length - 1)), 1400);
    return () => clearInterval(t);
  }, [stages]);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 text-[13px] animate-fade-in" aria-live="polite">
      {stages.map((s, idx) => (
        <span key={s} className={`flex items-center gap-2 transition-colors duration-300 ${idx < i ? 'text-slate-400' : idx === i ? 'font-medium text-slate-900' : 'text-slate-300'}`}>
          {idx < i ? <Check className="h-3.5 w-3.5" /> : <span className={`h-1.5 w-1.5 rounded-full ${idx === i ? 'animate-pulse bg-indigo-600' : 'bg-slate-300'}`} />}
          {idx === 0 && count ? `${s} (${count})` : s}
          {idx < stages.length - 1 && <span className="text-slate-300">→</span>}
        </span>
      ))}
    </div>
  );
}

function MiniEvent({ event }) {
  const { openEvent } = useApp();
  const m = catMeta(event.category);
  const Icon = m.icon;
  return (
    <button onClick={() => openEvent(event.id)} className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-md">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.soft}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{event.title}</div>
        <div className="truncate text-xs text-slate-500">{formatDate(event.date)} · {event.organizer}</div>
      </div>
      {event.registrationDeadline && <DeadlineBadge date={event.registrationDeadline} className="hidden sm:inline-flex" />}
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-600" />
    </button>
  );
}

function BriefingItem({ item, event }) {
  const { openEvent, toggleRegister, registered } = useApp();
  const [open, setOpen] = useState(false);
  const k = KINDS[item.kind];
  const dl = deadlineInfo(event.registrationDeadline);
  return (
    <li className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 py-3 text-left">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${k.tone}`}><k.icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{event.title}</span>
          <span className="block truncate text-xs text-slate-500">{event.category} · {formatDate(event.date)}{dl && dl.level !== 'closed' ? ` · ${dl.short}` : ''}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`expand ${open ? 'open' : ''}`}>
        <div>
          <div className="pb-4 pl-11">
            <p className="text-sm leading-relaxed text-slate-600">{item.reason}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEvent(event.id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black">Details</button>
              {dl?.level !== 'closed' && <button onClick={() => toggleRegister(event.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">{registered.includes(event.id) ? 'Registered' : 'Register'}</button>}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function Briefing({ data }) {
  const { eventsById, user } = useApp();
  const [filter, setFilter] = useState(null);
  const items = data.items.map((i) => ({ i, e: eventsById.get(i.eventId) })).filter((x) => x.e);
  const count = (kind) => items.filter((x) => x.i.kind === kind).length;
  const shown = filter ? items.filter((x) => x.i.kind === filter) : items;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm animate-slide-up">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Your week</p>
          <span className="text-[11px] text-slate-400">{data.source === 'claude' ? 'Built by Claude' : 'Auto briefing'}{data.personalised ? '' : ' · sign in to personalise'}</span>
        </div>
        <p className="mt-3 text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">{data.headline}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {Object.entries(KINDS).map(([kind, k]) => {
            const n = count(kind);
            const on = filter === kind;
            return (
              <button key={kind} onClick={() => setFilter(on ? null : kind)} disabled={!n} aria-pressed={on}
                className={`rounded-xl border p-3 text-left transition disabled:opacity-40 sm:p-4 ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200/80 hover:border-slate-300'}`}>
                <div className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{n}</div>
                <div className={`mt-0.5 text-[11px] leading-tight sm:text-xs ${on ? 'text-slate-300' : 'text-slate-500'}`}>{n === 1 ? k.one : k.label}</div>
              </button>
            );
          })}
        </div>
      </div>
      <ul className="px-5 sm:px-6">{shown.map(({ i, e }) => <BriefingItem key={i.eventId} item={i} event={e} />)}</ul>
      {!user && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:px-6">Based on default interests. Sign in so the briefing uses your skills, goals and availability.</p>}
    </div>
  );
}

export default function AskCampus() {
  const { preferences, eventsById, events } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(null); // null | 'ask' | 'brief'
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const autoSent = useRef(false);

  useEffect(() => { if (messages.length || busy) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (text, base = messages) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput('');
    const history = base.filter((m) => !m.error && (m.role === 'user' || m.role === 'assistant')).map((m) => ({ role: m.role, content: m.content }));
    const next = [...base, { role: 'user', content: question }];
    setMessages(next);
    setBusy('ask');
    try {
      const res = await api.ask(question, history, preferences);
      setMessages([...next, { role: 'assistant', content: res.answer, eventIds: res.eventIds }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', error: true, content: err.message, question }]);
    } finally {
      setBusy(null);
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const brief = async (base = messages) => {
    if (busy) return;
    const next = [...base, { role: 'user', content: 'What should I focus on this week?' }];
    setMessages(next);
    setBusy('brief');
    try {
      const data = await api.briefing(preferences);
      setMessages([...next, { role: 'briefing', data }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', error: true, content: err.message, briefing: true }]);
    } finally {
      setBusy(null);
    }
  };

  const retry = () => {
    const failed = messages[messages.length - 1];
    const base = messages.slice(0, -2);
    if (failed.briefing) brief(base); else send(failed.question, base);
  };

  // Auto-run a question/briefing passed from Home, Deadlines or the command palette.
  useEffect(() => {
    const st = location.state;
    if ((st?.q || st?.briefing) && !autoSent.current && events.length) {
      autoSent.current = true;
      navigate('.', { replace: true, state: null });
      if (st.briefing || /focus on this week/i.test(st.q || '')) brief([]); else send(st.q, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const empty = messages.length === 0 && !busy;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--header-h)-var(--bottomnav-h)-4rem)] max-w-3xl flex-col lg:min-h-[calc(100dvh-var(--header-h)-6rem)]">
      {empty ? (
        <div className="flex-1 animate-fade-in">
          <p className="eyebrow">Ask Campus</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1] tracking-[-0.035em] text-slate-900 sm:text-[56px]">Ask your <span className="serif-accent text-indigo-600">campus.</span></h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-500">Answers come from {events.length} live CampusOne listings, so nothing about your campus is made up. General questions work too.</p>

          <button onClick={() => brief()} className="group mt-8 flex w-full items-center gap-4 rounded-2xl bg-slate-900 p-5 text-left text-white transition hover:bg-black sm:p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10"><Sparkles className="h-5 w-5 text-indigo-300" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold tracking-tight">What should I focus on this week?</span>
              <span className="mt-0.5 block text-sm text-slate-400">A briefing: what matches you, what's closing, what builds your portfolio.</span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:text-white" />
          </button>

          <p className="eyebrow mb-2 mt-10">Or ask</p>
          <ul className="divide-y divide-slate-200/70 border-y border-slate-200/70">
            {SUGGESTIONS.map((s, i) => (
              <li key={s}>
                <button onClick={() => send(s)} className="group flex w-full items-center gap-4 py-3.5 text-left text-[15px] text-slate-700 transition hover:text-slate-900">
                  <span className="w-5 font-display text-xs tabular-nums text-slate-300">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{s}</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex-1 space-y-8 pb-6" aria-live="polite">
          <div className="flex items-center justify-between">
            <p className="eyebrow flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-indigo-500" />Ask Campus</p>
            <button onClick={() => setMessages([])} disabled={Boolean(busy)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"><RotateCcw className="h-4 w-4" />New</button>
          </div>
          {messages.map((m, i) => (
            m.role === 'user' ? (
              <h2 key={i} className="text-[22px] font-semibold leading-snug tracking-tight text-slate-900 animate-slide-up sm:text-2xl">{m.content}</h2>
            ) : m.role === 'briefing' ? (
              <Briefing key={i} data={m.data} />
            ) : m.error ? (
              <div key={i} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 animate-slide-up">
                <p className="flex items-center gap-2 text-sm font-semibold text-red-800"><AlertCircle className="h-4 w-4" />Ask Campus couldn't answer right now</p>
                <p className="mt-1 text-sm text-red-700">{m.content}</p>
                {i === messages.length - 1 && <button onClick={retry} className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100">Try again</button>}
              </div>
            ) : (
              <div key={i} className="animate-slide-up">
                <div className="border-l-2 border-indigo-600 pl-5"><Markdown text={m.content} /></div>
                {m.eventIds?.length > 0 && (
                  <div className="mt-5">
                    <p className="eyebrow mb-2">From CampusOne</p>
                    <div className="grid gap-2 sm:grid-cols-2">{m.eventIds.map((id) => eventsById.get(id)).filter(Boolean).map((e) => <MiniEvent key={e.id} event={e} />)}</div>
                  </div>
                )}
              </div>
            )
          ))}
          {busy && <Thinking stages={busy === 'brief' ? BRIEF_STAGES : STAGES} count={events.length} />}
          {!busy && messages.length > 0 && messages[messages.length - 1].role !== 'user' && !messages[messages.length - 1].error && (
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {!messages.some((m) => m.role === 'briefing') && <button onClick={() => brief()} className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Brief my week</button>}
              {SUGGESTIONS.filter((s) => !messages.some((m) => m.content === s)).slice(0, 3).map((s) => (
                <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900">{s}</button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="sticky bottom-[calc(var(--bottomnav-h)+8px)] z-10 mt-6 lg:bottom-4">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 pl-4 shadow-lg backdrop-blur transition focus-within:border-slate-400">
          <label htmlFor="ask-input" className="sr-only">Ask a question about campus</label>
          <textarea id="ask-input" ref={inputRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about events, deadlines, clubs…"
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] placeholder:text-slate-400 focus:outline-none" />
          <button type="submit" disabled={!input.trim() || Boolean(busy)} aria-label="Send question"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white transition hover:bg-black active:scale-95 disabled:bg-slate-200 disabled:text-slate-400">
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 hidden items-center justify-center gap-1 text-center text-xs text-slate-400 sm:flex"><ShieldCheck className="h-3.5 w-3.5" />Grounded in {events.length} CampusOne listings · Powered by Claude</p>
      </form>
    </div>
  );
}
