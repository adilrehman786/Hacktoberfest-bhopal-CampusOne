import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Sparkles, ArrowRight, Handshake } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { useScrollLock } from '../lib/scrollLock.js';
import { catMeta } from '../lib/categories.js';
import { deadlineInfo, formatDate } from '../lib/dates.js';
import { NAV, MORE_NAV } from '../lib/nav.js';

const PAGES = [...NAV, ...MORE_NAV, { to: '/profile', label: 'My Profile' }, { to: '/team/mine', label: 'My Team' }];

/** Ctrl/Cmd+K: search events and pages, or hand the query to Ask Campus / Team Builder. */
export default function CommandPalette({ open, onClose }) {
  const { events, openEvent } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const evs = (terms.length
      ? events.filter((e) => { const hay = [e.title, e.organizer, e.category, ...(e.tags || [])].join(' ').toLowerCase(); return terms.every((t) => hay.includes(t)); })
      : [...events].filter((e) => deadlineInfo(e.registrationDeadline)?.level !== 'closed').sort((a, b) => (a.registrationDeadline || '9').localeCompare(b.registrationDeadline || '9'))
    ).slice(0, 6).map((e) => ({ kind: 'event', id: e.id, e, run: () => openEvent(e.id) }));
    const pages = PAGES.filter((p) => !terms.length || p.label.toLowerCase().includes(query)).slice(0, terms.length ? 3 : 0)
      .map((p) => ({ kind: 'page', id: p.to, p, run: () => navigate(p.to) }));
    const actions = query ? [
      { kind: 'ask', id: 'ask', run: () => navigate('/ask', { state: { q: q.trim() } }) },
      { kind: 'team', id: 'team', run: () => navigate('/team', { state: { prefill: q.trim() } }) },
    ] : [];
    return [...actions.slice(0, 1), ...evs, ...pages, ...actions.slice(1)];
  }, [q, events, navigate, openEvent]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!open) return null;
  const run = (item) => { onClose(); item?.run(); };
  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[active]); }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-3 pt-[min(14dvh,120px)]" role="dialog" aria-modal="true" aria-label="Search CampusOne">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[min(560px,76dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-scale-in" onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, clubs, pages… or ask anything"
            aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={`pal-${active}`}
            className="min-w-0 flex-1 bg-transparent py-4 text-[15px] placeholder:text-slate-400 focus:outline-none" />
          <kbd className="rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400">ESC</kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="overlay-scroll p-1.5">
          {!q && <p className="eyebrow px-3 pb-1 pt-2">Closing soon</p>}
          {items.map((it, i) => {
            const on = i === active;
            const base = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? 'bg-slate-100' : ''}`;
            const common = { id: `pal-${i}`, 'data-idx': i, role: 'option', 'aria-selected': on, onMouseMove: () => setActive(i), onClick: () => run(it), className: base };
            if (it.kind === 'ask') return <button key={it.id} {...common}><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white"><Sparkles className="h-4 w-4" /></span><span className="flex-1">Ask Campus: <span className="font-semibold">“{q}”</span></span>{on && <CornerDownLeft className="h-4 w-4 text-slate-400" />}</button>;
            if (it.kind === 'team') return <button key={it.id} {...common}><span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600"><Handshake className="h-4 w-4" /></span><span className="flex-1">Build a team for <span className="font-semibold">“{q}”</span></span>{on && <CornerDownLeft className="h-4 w-4 text-slate-400" />}</button>;
            if (it.kind === 'page') return <button key={it.id} {...common}><span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500"><ArrowRight className="h-4 w-4" /></span><span className="flex-1 font-medium">{it.p.label}</span><span className="text-xs text-slate-400">Page</span></button>;
            const m = catMeta(it.e.category);
            const Icon = m.icon;
            const dl = deadlineInfo(it.e.registrationDeadline);
            return (
              <button key={it.id} {...common}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.soft}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900">{it.e.title}</span><span className="block truncate text-xs text-slate-400">{it.e.category} · {formatDate(it.e.date)} · {it.e.organizer}</span></span>
                {dl && dl.level !== 'later' && <span className={`shrink-0 text-xs font-semibold ${dl.level === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{dl.short}</span>}
              </button>
            );
          })}
          {q && items.length <= 2 && <p className="px-3 py-3 text-sm text-slate-400">No listings match “{q}”. Ask Campus can still help.</p>}
        </div>
      </div>
    </div>
  );
}
