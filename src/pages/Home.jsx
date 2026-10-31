import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, Inbox, ChevronRight, Handshake, Lock, CornerDownLeft, Radar, Network, Wand2 } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { CATEGORIES } from '../lib/categories.js';
import { daysUntil, greeting } from '../lib/dates.js';
import { AnimatedSection } from '../lib/motion.jsx';
import EventCard from '../components/EventCard.jsx';
import CampusUniverse from '../components/home/CampusUniverse.jsx';
import OpportunityStack from '../components/OpportunityStack.jsx';
import DeadlineRadar from '../components/DeadlineRadar.jsx';
import CampusGraph from '../components/CampusGraph.jsx';
import TeamGraph from '../components/team/TeamGraph.jsx';
import { SectionHeader, CardSkeleton, AIBadge, Button } from '../components/ui.jsx';

const QUICK = ['Hackathon', 'Workshop', 'Competition', 'Club', 'Internship', 'Scholarship', 'Seminar', 'Event'];
const PROMPTS = ['What should I focus on this week?', 'Which hackathons can I still join?', 'Anything free this weekend?'];

function Hero() {
  const { user, events, openEvent } = useApp();
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const counts = useMemo(() => ({
    hot: events.filter((e) => e.category === 'Hackathon' || e.category === 'Competition').length,
    closing: events.filter((e) => { const n = daysUntil(e.registrationDeadline); return n !== null && n >= 0 && n <= 2; }).length,
    week: events.filter((e) => { const n = daysUntil(e.date); return n !== null && n >= 0 && n <= 7; }).length,
  }), [events]);
  const ask = (text) => navigate('/ask', { state: { q: (text ?? q).trim() || undefined } });

  return (
    <section className="relative grid items-center gap-6 pb-4 lg:grid-cols-[1.05fr_1fr] lg:gap-4 lg:pb-10">
      <div className="relative z-10 animate-slide-up">
        <p className="eyebrow">{user ? `${greeting()}, ${user.name.split(' ')[0]}` : `${events.length || '—'} live listings on your campus`}</p>
        <h1 className="mt-4 text-[52px] font-semibold leading-[0.95] tracking-[-0.045em] text-slate-900 sm:text-[72px] lg:text-[84px]">
          Campus,<br /><span className="serif-accent text-[1.08em] text-indigo-600">understood.</span>
        </h1>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-slate-500">One intelligent layer for everything happening around your campus: events, deadlines, people and the teams you could build.</p>

        <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-8 max-w-lg">
          <label htmlFor="hero-ask" className="sr-only">Ask Campus anything</label>
          <div className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-4 shadow-md transition focus-within:border-slate-300 focus-within:shadow-lg">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
            <input id="hero-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask your campus anything…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none" />
            <button type="submit" aria-label="Ask Campus" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white transition hover:bg-black active:scale-95"><CornerDownLeft className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PROMPTS.map((p) => <button key={p} type="button" onClick={() => ask(p)} className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[12.5px] text-slate-600 transition hover:border-slate-300 hover:text-slate-900">{p}</button>)}
          </div>
        </form>

        <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div><dt className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-indigo-600" />Hackathons & contests</dt><dd className="font-display text-2xl font-semibold tabular-nums text-slate-900">{counts.hot}</dd></div>
          <div><dt className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-red-600" />Closing in 48h</dt><dd className="font-display text-2xl font-semibold tabular-nums text-slate-900">{counts.closing}</dd></div>
          <div><dt className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-900" />Happening this week</dt><dd className="font-display text-2xl font-semibold tabular-nums text-slate-900">{counts.week}</dd></div>
        </dl>
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <CampusUniverse events={events} onSelect={openEvent} className="h-[320px] sm:h-[440px] lg:h-[540px]" />
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-slate-400">Every point is a live listing. Hover to explore, click to open.</p>
      </div>
    </section>
  );
}

function YourOpportunities() {
  const { user, recs, eventsById, requireAuth, authLoading } = useApp();
  if (authLoading) return null;
  if (!user) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 space-y-3 p-6 opacity-50 blur-[3px]" aria-hidden>
          {[92, 86, 78].map((v) => (
            <div key={v} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"><div className="h-12 w-12 rounded-full border-4 border-indigo-200" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-indigo-100" /><div className="h-4 w-2/3 rounded bg-slate-200" /></div></div>
          ))}
        </div>
        <div className="relative mx-auto max-w-md text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white"><Lock className="h-5 w-5" /></span>
          <p className="mt-4 text-lg font-semibold tracking-tight text-slate-900">Your opportunities, ranked and explained</p>
          <p className="mt-1.5 text-sm text-slate-500">Sign in and tell CampusOne what you're into. Claude ranks every listing and shows exactly why it fits you.</p>
          <Button variant="ai" className="mt-5" onClick={() => requireAuth(null)}><Sparkles className="h-4 w-4" />Personalise CampusOne</Button>
        </div>
      </div>
    );
  }
  if (recs.loading) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-slate-500"><Sparkles className="h-4 w-4 animate-pulse text-indigo-500" />Ranking {eventsById.size} listings against your profile…</p>
        {[1, 2, 3].map((i) => <div key={i} className="surface flex items-center gap-4 p-5"><div className="skeleton h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-28" /><div className="skeleton h-4 w-2/3" /></div></div>)}
      </div>
    );
  }
  const items = recs.items.map((r) => ({ rec: r, event: eventsById.get(r.id) })).filter((x) => x.event).slice(0, 4);
  if (!items.length) {
    return <div className="surface p-8 text-center"><p className="font-semibold text-slate-900">Nothing matches your current interests.</p><p className="mt-1 text-sm text-slate-500">Try expanding your interests or adding skills.</p><Link to="/profile" className="mt-4 inline-block"><Button variant="secondary">Update profile</Button></Link></div>;
  }
  return <OpportunityStack items={items} />;
}

function WhileAway() {
  const { preferences, openEvent } = useApp();
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    let alive = true;
    api.summarise(preferences)
      .then((data) => alive && setState({ loading: false, data }))
      .catch(() => alive && setState({ loading: false, data: null }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!state.loading && !state.data) return null;
  return (
    <div className="surface h-full p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5" />While you were away</p>
        <AIBadge>{state.data?.source === 'local' ? 'Auto summary' : 'Claude'}</AIBadge>
      </div>
      {state.loading ? (
        <div className="mt-5 space-y-3"><div className="skeleton h-5 w-4/5" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-5/6" /><div className="skeleton h-4 w-2/3" /></div>
      ) : (
        <>
          <p className="mt-4 text-[17px] font-medium leading-snug tracking-tight text-slate-900">{state.data.headline}</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {state.data.highlights.map((h, i) => (
              <li key={h.id + i}>
                <button onClick={() => openEvent(h.id)} className="group flex w-full items-start gap-3 py-2.5 text-left text-sm text-slate-600 transition hover:text-slate-900">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <span className="flex-1">{h.text}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AskTeaser() {
  const navigate = useNavigate();
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.3) 1px, transparent 0)', backgroundSize: '20px 20px', maskImage: 'linear-gradient(135deg, black, transparent 60%)', WebkitMaskImage: 'linear-gradient(135deg, black, transparent 60%)' }} aria-hidden />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ask Campus</p>
      <p className="relative mt-4 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">“What should I <span className="serif-accent text-indigo-300">focus on</span> this week?”</p>
      <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-slate-400">Get a briefing built from live listings and your profile: what matches, what's closing, and what builds your portfolio.</p>
      <div className="flex-1" />
      <button onClick={() => navigate('/ask', { state: { briefing: true } })} className="relative mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
        <Sparkles className="h-4 w-4 text-indigo-600" />Build my weekly briefing
      </button>
    </div>
  );
}

// Illustration of the Team Builder output (clearly labelled as an example).
const EXAMPLE_ANALYSIS = {
  projectName: 'AI Medical Image Analysis',
  projectSummary: 'A web platform that flags anomalies in X-ray images using a deep-learning model.',
  projectTags: ['AI', 'Healthcare', 'Web'],
  roles: [
    { role: 'ML Engineer', skills: ['Python', 'PyTorch', 'Computer Vision'], icon: 'ml', coveredByRequester: true },
    { role: 'Frontend Developer', skills: ['React', 'TypeScript'], icon: 'frontend', coveredByRequester: false },
    { role: 'UI/UX Designer', skills: ['Figma', 'Prototyping'], icon: 'design', coveredByRequester: false },
  ],
};
const EXAMPLE_MATCHES = [
  { studentId: 'ex-rahul', role: 'Frontend Developer', score: 94, matchedSkills: ['React', 'TypeScript'], student: { name: 'Rahul Sharma', skills: ['React', 'Node.js'] } },
  { studentId: 'ex-priya', role: 'UI/UX Designer', score: 91, matchedSkills: ['Figma', 'Prototyping'], student: { name: 'Priya Nair', skills: ['Figma'] } },
];

function TeamShowcase() {
  return (
    <div className="surface overflow-hidden">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_2fr] lg:gap-10">
        <div className="flex flex-col">
          <p className="eyebrow flex items-center gap-1.5"><Handshake className="h-3.5 w-3.5" />AI Team Builder</p>
          <h3 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-tight text-slate-900">Describe the idea.<br /><span className="serif-accent text-indigo-600">Meet the team.</span></h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">Claude reads your project, works out the roles it needs, and CampusOne matches students by skills, interests, goals and availability.</p>
          <div className="flex-1" />
          <Link to="/team" className="mt-6"><Button variant="ai"><Sparkles className="h-4 w-4" />Build your team</Button></Link>
        </div>
        <div>
          <p className="mb-3 text-right text-[11px] text-slate-400">Example output</p>
          <TeamGraph analysis={EXAMPLE_ANALYSIS} matches={EXAMPLE_MATCHES} selected={EXAMPLE_MATCHES.map((m) => m.studentId)} user={{ name: 'You' }} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { events, loading, loadError, reloadEvents, user } = useApp();
  const soon = useMemo(() => events
    .filter((e) => e.category !== 'Announcement' && e.date && daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6), [events]);
  const counts = useMemo(() => events.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + 1 }), {}), [events]);

  if (loadError) {
    return (
      <div className="surface p-6">
        <p className="font-semibold text-slate-900">Couldn't load campus data</p>
        <p className="mt-1 text-sm text-slate-500">{loadError}</p>
        <Button className="mt-4" onClick={reloadEvents}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-20 sm:space-y-28">
      <Hero />

      <AnimatedSection>
        <SectionHeader eyebrow="01 · For you" title="Your opportunities" subtitle={user ? 'Ranked by Claude. Open one to see exactly why it fits.' : 'Personal ranking with a reason for every match.'}
          action={<Link to="/discover" className="hidden items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 sm:flex">All listings<ArrowRight className="h-4 w-4" /></Link>} />
        <YourOpportunities />
      </AnimatedSection>

      <AnimatedSection>
        <SectionHeader eyebrow="02 · Timing" title={<span className="flex items-center gap-2"><Radar className="h-5 w-5 text-slate-400" />Deadline radar</span>} subtitle="Registrations closing in the next two weeks. Nearer days get more room."
          action={<Link to="/deadlines" className="hidden items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 sm:flex">All deadlines<ArrowRight className="h-4 w-4" /></Link>} />
        <div className="surface px-4 py-6 sm:px-6">{loading ? <div className="skeleton h-[300px]" /> : <DeadlineRadar />}</div>
      </AnimatedSection>

      <AnimatedSection>
        <SectionHeader eyebrow="03 · Intelligence" title="Ask, and get a plan" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <AskTeaser />
          <WhileAway />
        </div>
      </AnimatedSection>

      <AnimatedSection>
        <SectionHeader eyebrow="04 · People" title="Turn opportunities into teams" />
        <TeamShowcase />
      </AnimatedSection>

      <AnimatedSection>
        <SectionHeader eyebrow="05 · Network" title={<span className="flex items-center gap-2"><Network className="h-5 w-5 text-slate-400" />Your campus network</span>} subtitle="How your interests and skills connect to what's happening. Hover a node to trace it." />
        <div className="surface p-4 sm:p-8"><CampusGraph /></div>
      </AnimatedSection>

      <AnimatedSection>
        <SectionHeader eyebrow="06 · Explore" title="Happening soon" action={<Link to="/discover" className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">Discover<ArrowRight className="h-4 w-4" /></Link>} />
        <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {QUICK.map((c) => {
            const m = CATEGORIES[c];
            const Icon = m.icon;
            return (
              <Link key={c} to={`/discover?cat=${c}`} className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white py-1.5 pl-2 pr-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
                <span className={`grid h-6 w-6 place-items-center rounded-full ${m.soft}`}><Icon className="h-3.5 w-3.5" /></span>{m.label}<span className="text-slate-400">{counts[c] || 0}</span>
              </Link>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? [1, 2, 3].map((i) => <CardSkeleton key={i} />) : soon.map((e, i) => <EventCard key={e.id} event={e} style={{ animationDelay: `${i * 50}ms` }} />)}
        </div>
        <Link to="/organise" className="group mt-6 flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 p-4 transition hover:border-slate-400 hover:bg-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><Wand2 className="h-5 w-5" /></span>
          <span className="flex-1"><span className="block text-sm font-semibold text-slate-900">Seen an announcement that's not here?</span><span className="block text-sm text-slate-500">Paste it into AI Organise and Claude turns it into a listing.</span></span>
          <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-slate-600" />
        </Link>
      </AnimatedSection>
    </div>
  );
}
