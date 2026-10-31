import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, SearchX, ArrowDownUp } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { CATEGORIES } from '../lib/categories.js';
import { daysUntil } from '../lib/dates.js';
import { matchFor, eventText } from '../lib/match.js';
import EventCard from '../components/EventCard.jsx';
import { PageHeader, CardSkeleton, EmptyState, Button } from '../components/ui.jsx';

const MAIN_FILTERS = ['All', 'Hackathon', 'Event', 'Workshop', 'Competition', 'Club', 'Internship', 'Scholarship', 'Seminar', 'Announcement'];

// Topic lenses across categories.
const TOPICS = [
  { id: 'ai', label: 'AI', words: ['ai', 'machine learning', 'llm', 'llms', 'ml', 'generative'] },
  { id: 'web', label: 'Web', words: ['web', 'react', 'javascript', 'frontend', 'web development', 'web3'] },
  { id: 'design', label: 'Design', words: ['design', 'ui/ux', 'figma', 'ux', 'creative'] },
  { id: 'business', label: 'Business', words: ['entrepreneurship', 'startup', 'startups', 'business', 'pitching', 'finance'] },
  { id: 'hackathons', label: 'Hackathons', cats: ['Hackathon', 'Competition'] },
  { id: 'clubs', label: 'Clubs', cats: ['Club'] },
];
const esc = (k) => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const topicTest = (t, e) => (t.cats ? t.cats.includes(e.category) : t.words.some((w) => new RegExp(`(^|[^a-z0-9])${esc(w)}([^a-z0-9]|$)`).test(eventText(e))));

const QUICK_FILTERS = [
  { id: 'week', label: 'This week', test: (e) => { const n = daysUntil(e.date); return n !== null && n >= 0 && n <= 7; } },
  { id: 'open', label: 'Registration open', test: (e) => { const n = daysUntil(e.registrationDeadline); return n !== null && n >= 0; } },
  { id: 'free', label: 'Free', test: (e) => !e.fee || /free/i.test(e.fee) },
  { id: 'online', label: 'Online', test: (e) => e.mode === 'Online' || e.mode === 'Hybrid' },
];

const SORTS = { match: 'Best match', deadline: 'Soonest deadline', new: 'Newest', trending: 'Trending', date: 'Event date' };

export default function Discover({ title = 'Discover', subtitle = 'Every opportunity on campus, ranked for you.', categories }) {
  const { events, loading, recById, profile, requireAuth } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [quick, setQuick] = useState([]);
  const [topic, setTopic] = useState(null);
  const [sort, setSortState] = useState(profile ? 'match' : 'date');
  const sortTouched = useRef(false);
  const setSort = (v) => { sortTouched.current = true; setSortState(v); };
  // Profile loads after first paint: default to Best match once it's available.
  useEffect(() => { if (profile && !sortTouched.current) setSortState('match'); }, [profile]);
  const cat = params.get('cat') || 'All';
  const setCat = (c) => { const p = new URLSearchParams(params); c === 'All' ? p.delete('cat') : p.set('cat', c); setParams(p, { replace: true }); };

  const scoped = useMemo(() => (categories ? events.filter((e) => categories.includes(e.category)) : events), [events, categories]);
  const filters = categories ? (categories.length > 1 ? ['All', ...categories] : []) : MAIN_FILTERS;
  const scores = useMemo(() => new Map(scoped.map((e) => [e.id, profile ? matchFor(e, recById.get(e.id), profile).score : 0])), [scoped, profile, recById]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
      .map((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    const t = TOPICS.find((x) => x.id === topic);
    const list = scoped.filter((e) => {
      if (cat !== 'All' && e.category !== cat) return false;
      if (t && !topicTest(t, e)) return false;
      if (!quick.every((id) => QUICK_FILTERS.find((f) => f.id === id).test(e))) return false;
      if (!terms.length) return true;
      const hay = [e.title, e.organizer, e.description, e.category, e.location, ...(e.tags || [])].join(' ').toLowerCase();
      return terms.every((re) => re.test(hay));
    });
    const s = sort === 'match' && !profile ? 'date' : sort;
    const by = {
      match: (a, b) => scores.get(b.id) - scores.get(a.id),
      deadline: (a, b) => (a.registrationDeadline && daysUntil(a.registrationDeadline) >= 0 ? a.registrationDeadline : '9999').localeCompare(b.registrationDeadline && daysUntil(b.registrationDeadline) >= 0 ? b.registrationDeadline : '9999'),
      new: (a, b) => (b.postedAt || '').localeCompare(a.postedAt || ''),
      // Trending: posted recently and happening soon (no popularity data yet, so recency x proximity).
      trending: (a, b) => trend(b) - trend(a),
      date: (a, b) => (a.date || '9999').localeCompare(b.date || '9999'),
    }[s];
    return list.sort(by);
  }, [scoped, cat, quick, query, sort, topic, scores, profile]);

  const toggleQuick = (id) => setQuick((q) => (q.includes(id) ? q.filter((x) => x !== id) : [...q, id]));
  const clearAll = () => { setQuery(''); setQuick([]); setTopic(null); setCat('All'); };
  const countFor = (c) => (c === 'All' ? scoped.length : scoped.filter((e) => e.category === c).length);
  const filtered = query || quick.length || topic || cat !== 'All';

  return (
    <div>
      <PageHeader eyebrow={`${scoped.length} listings`} title={title} subtitle={subtitle} />

      {/* Sticky filter bar sits under the header via --header-h (no magic numbers). */}
      <div className="sticky top-[var(--header-h)] z-20 -mx-4 border-b border-slate-200/70 bg-paper/90 px-4 pb-3 pt-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-slate-400">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="sr-only">Search opportunities</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, club, topic, venue…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] placeholder:text-slate-400 focus:outline-none" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
          </label>
          <label className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <ArrowDownUp className="h-4 w-4 text-slate-400" aria-hidden />
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => { if (e.target.value === 'match' && !profile) { requireAuth(() => setSort('match'), { reason: 'Sign in to sort opportunities by how well they match you.' }); return; } setSort(e.target.value); }}
              className="w-[6.5rem] bg-transparent py-2.5 pr-1 font-medium focus:outline-none sm:w-auto sm:max-w-[9.5rem]">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        <div className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Topics">
          {TOPICS.map((t) => (
            <button key={t.id} aria-pressed={topic === t.id} onClick={() => setTopic(topic === t.id ? null : t.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${topic === t.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-slate-300'}`}>
              {t.label}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 self-stretch bg-slate-200" aria-hidden />
          {QUICK_FILTERS.map((f) => (
            <button key={f.id} aria-pressed={quick.includes(f.id)} onClick={() => toggleQuick(f.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${quick.includes(f.id) ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filters.length > 0 && (
        <div className="scrollbar-none -mx-4 mt-4 flex gap-5 overflow-x-auto border-b border-slate-200/70 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Category">
          {filters.map((c) => {
            const active = cat === c;
            const label = c === 'All' ? 'All' : CATEGORIES[c]?.label || c;
            return (
              <button key={c} role="tab" aria-selected={active} onClick={() => setCat(c)}
                className={`relative shrink-0 pb-3 pt-1 text-sm font-medium transition ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                {label} <span className="text-slate-400">{countFor(c)}</span>
                {active && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-slate-900" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 mt-5 flex items-center justify-between text-sm text-slate-500">
        <span><strong className="font-semibold text-slate-900">{results.length}</strong> {results.length === 1 ? 'result' : 'results'}{sort === 'match' && profile ? ' · ranked for you' : ''}</span>
        {filtered && <button onClick={clearAll} className="font-medium text-slate-700 underline-offset-4 hover:underline">Clear filters</button>}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)}</div>
      ) : results.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((e, i) => <EventCard key={e.id} event={e} recommendation={recById.get(e.id)} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }} />)}
        </div>
      ) : (
        <EmptyState icon={SearchX} title={profile && !query ? 'Nothing matches your current filters.' : 'No listings match that search.'}
          text={profile ? 'Try a broader topic, or expand your interests so CampusOne can surface more.' : 'Try a different keyword or remove a filter. New opportunities are added every day.'}
          action={<div className="flex flex-wrap justify-center gap-2"><Button variant="secondary" onClick={clearAll}>Clear filters</Button>{profile && <Link to="/profile"><Button variant="ghost">Update interests</Button></Link>}</div>} />
      )}
    </div>
  );
}

function trend(e) {
  const posted = e.postedAt ? -daysUntil(e.postedAt) : 30;
  const until = e.date ? daysUntil(e.date) : 60;
  if (until < 0) return -100;
  return 40 - posted * 4 - Math.max(0, until) * 1.2 + (e.category === 'Hackathon' ? 6 : 0);
}
