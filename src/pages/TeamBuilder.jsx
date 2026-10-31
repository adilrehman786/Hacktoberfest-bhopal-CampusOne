import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import TeamGraph from '../components/team/TeamGraph.jsx';
import {
  Sparkles, Handshake, Brain, Atom, Palette, Server, Layers, Smartphone, BarChart3, Cloud, Shield, Lightbulb, Puzzle,
  Check, CircleCheck, UserPlus, Eye, RotateCcw, Users, LoaderCircle, AlertTriangle, X, Trophy, ArrowRight, Info, UsersRound,
} from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { RequireAuth, Avatar } from '../components/auth.jsx';
import { SkillPill, DemoBadge, StudentProfileModal } from '../components/profile.jsx';
import { Button, AIBadge, EmptyState } from '../components/ui.jsx';

const STORE_KEY = 'campusone.teambuilder';
const EXAMPLE = "I'm building an AI-powered study assistant. It uses Python and machine learning on the backend and React on the frontend. I need someone strong in frontend and someone who can design the UI.";
const ROLE_ICONS = { ml: Brain, frontend: Atom, backend: Server, fullstack: Layers, design: Palette, mobile: Smartphone, data: BarChart3, cloud: Cloud, security: Shield, product: Lightbulb, other: Puzzle };
const STEPS = ['Analysing project…', 'Finding skill gaps…', 'Matching students…', 'Building your team…'];

const loadSaved = () => { try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } };

export function ScoreRing({ value, size = 64, stroke = 6, label = true, className = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `ring-${size}-${stroke}`;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={`${value}% match`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#a855f7" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2ff" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      {label && <div className="absolute inset-0 grid place-items-center"><span className="font-bold tracking-tight text-slate-900" style={{ fontSize: size * 0.27 }}>{value}<span className="text-[0.6em] text-slate-400">%</span></span></div>}
    </div>
  );
}

function MetricBar({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-semibold tabular-nums text-slate-900">{value}%</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${value}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

function Processing({ step }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl ai-glow bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/80 p-6 animate-fade-in sm:p-8" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div><p className="font-semibold text-slate-900">Claude is reading your project</p><p className="text-sm text-slate-500">One request: analysis, then matching. Usually a few seconds.</p></div>
      </div>
      <ol className="mt-6 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-[15px] transition-opacity duration-300 ${i > step ? 'opacity-35' : 'opacity-100'}`}>
            {i < step ? <CircleCheck className="h-5 w-5 text-emerald-500" /> : i === step ? <LoaderCircle className="h-5 w-5 animate-spin text-indigo-500" /> : <span className="h-5 w-5 rounded-full border-2 border-slate-200" />}
            <span className={i === step ? 'font-semibold text-indigo-900' : 'text-slate-600'}>{s.replace('…', i < step ? '' : '…')}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
    </div>
  );
}

function Requirements({ analysis, event }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 animate-slide-up">
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Project requirements</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{analysis.projectName}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{analysis.projectSummary}</p>
        </div>
        <AIBadge>Analysed by Claude</AIBadge>
      </div>
      {(analysis.projectTags?.length > 0 || event) && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {event && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"><Trophy className="h-3 w-3" />{event.title}</span>}
          {analysis.projectTags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t}</span>)}
        </div>
      )}
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {analysis.roles.map((r, i) => {
          const Icon = ROLE_ICONS[r.icon] || Puzzle;
          return (
            <div key={r.role} style={{ animationDelay: `${i * 70}ms` }} className={`rounded-2xl border p-4 animate-slide-up ${r.coveredByRequester ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200/80 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${r.coveredByRequester ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70'}`}><Icon className="h-[18px] w-[18px]" /></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900">{r.role}</div>
                  <div className={`text-[11px] font-semibold ${r.coveredByRequester ? 'text-emerald-700' : 'text-indigo-600'}`}>{r.coveredByRequester ? 'Covered by you' : 'Looking for teammate'}</div></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">{r.skills.map((s) => <span key={s} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{s}</span>)}</div>
              {r.why && <p className="mt-2 text-xs leading-relaxed text-slate-500">{r.why}</p>}
            </div>
          );
        })}
      </div>
      {analysis.followUpQuestion && (
        <p className="relative mt-4 flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />{analysis.followUpQuestion}</p>
      )}
    </section>
  );
}

function MatchCard({ m, selected, invited, onToggle, onView, onInvite, inviting, index }) {
  const s = m.student;
  return (
    <article style={{ animationDelay: `${index * 70}ms` }}
      className={`group relative flex flex-col rounded-2xl border bg-white p-5 transition-all duration-200 animate-slide-up hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] ${selected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200/80'}`}>
      <div className="flex items-start gap-3">
        <Avatar name={s.name} src={s.picture} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><h3 className="truncate font-semibold text-slate-900">{s.name}</h3>{s.demo && <DemoBadge />}</div>
          <p className="text-[13px] font-medium text-indigo-600">{m.role}</p>
          {m.suggested && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200/70"><Sparkles className="h-3 w-3" />Suggested</span>}
        </div>
        <div className="text-center">
          <ScoreRing value={m.score} size={58} stroke={5} />
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Match</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {s.skills.slice(0, 5).map((sk) => <SkillPill key={sk} tone={m.matchedSkills.includes(sk) ? 'indigo' : 'slate'}>{sk}</SkillPill>)}
      </div>
      <ul className="mt-4 space-y-1.5">
        {m.reasons.map((r) => <li key={r} className="flex items-start gap-2 text-[13px] text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{r}</li>)}
      </ul>
      <div className="min-h-4 flex-1" />
      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onToggle} aria-pressed={selected}
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${selected ? 'bg-indigo-600 text-white' : 'text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-indigo-300'}`}>
          {selected ? <><Check className="h-4 w-4" />In team</> : <><UsersRound className="h-4 w-4" />Add to team</>}
        </button>
        <button type="button" onClick={onView} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Eye className="h-4 w-4" /><span className="hidden sm:inline xl:hidden 2xl:inline">Profile</span></button>
        <div className="flex-1" />
        {invited ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"><CircleCheck className="h-4 w-4" />Invited</span>
        ) : (
          <button type="button" onClick={onInvite} disabled={inviting} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-600 active:scale-95 disabled:opacity-60">
            {inviting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Invite
          </button>
        )}
      </div>
    </article>
  );
}

function Compatibility({ user, members, compat, loading, error, onInviteAll, invitingAll, allInvited }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Team Compatibility</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">CampusOne Match Score</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-indigo-50 py-1 pl-1 pr-3"><Avatar name={user.name} src={user.picture} size={28} /><span className="text-sm font-semibold text-indigo-900">You</span></div>
        {members.map((m) => (
          <div key={m.studentId} className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ring-slate-200/70 animate-scale-in">
            <Avatar name={m.student.name} src={m.student.picture} size={28} /><span className="text-sm font-medium text-slate-800">{m.student.name.split(' ')[0]}</span><span className="hidden text-xs text-slate-400 sm:inline">· {m.role}</span>
          </div>
        ))}
      </div>

      {!members.length ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Add teammates from the recommendations to see how well your team fits the project.</p>
      ) : loading && !compat ? (
        <div className="mt-6 space-y-3"><div className="flex items-center gap-4"><div className="skeleton h-24 w-24 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-5/6" /><div className="skeleton h-4 w-4/6" /></div></div></div>
      ) : error ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4" />{error}</p>
      ) : compat && (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center">
              <ScoreRing value={compat.overall} size={112} stroke={9} />
              <span className="mt-2 text-xs font-semibold text-slate-500">Team Compatibility</span>
            </div>
            <div className="space-y-3">
              <MetricBar label="Technical coverage" value={compat.metrics.technicalCoverage} />
              <MetricBar label="Interest alignment" value={compat.metrics.interestAlignment} />
              <MetricBar label="Availability" value={compat.metrics.availability} />
              <MetricBar label="Project experience" value={compat.metrics.projectExperience} />
            </div>
          </div>
          <div className="mt-6 rounded-2xl ai-glow bg-gradient-to-br from-indigo-50/80 to-violet-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-500" />{compat.source === 'claude' ? 'Why this team works, by Claude' : 'Why this team works'}
              {loading && <LoaderCircle className="ml-auto h-4 w-4 animate-spin text-indigo-400" />}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-indigo-950/80">{compat.explanation}</p>
            {compat.gap && <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />{compat.gap}</p>}
          </div>
        </div>
      )}
      {members.length > 0 && (
        <Button variant="ai" className="mt-5 w-full py-3" onClick={onInviteAll} disabled={invitingAll}>
          {invitingAll ? <LoaderCircle className="h-4 w-4 animate-spin" /> : allInvited ? <ArrowRight className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
          {allInvited ? 'View My Team' : `Invite ${members.length === 1 ? members[0].student.name.split(' ')[0] : `all ${members.length}`} & save team`}
        </Button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">The CampusOne Match Score is a heuristic based on profile skills, interests, goals, availability and experience. It's a starting point, not an objective measure.</p>
    </section>
  );
}

function Builder() {
  const { user, eventsById, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const saved = useRef(loadSaved()).current;
  const eventId = params.get('event') || null;
  const event = eventId ? eventsById.get(eventId) : null;
  const sameCtx = (saved.eventId || null) === eventId;

  const location = useLocation();
  const [description, setDescription] = useState(location.state?.prefill || (sameCtx ? saved.description || '' : ''));
  const [result, setResult] = useState(sameCtx ? saved.result || null : null);
  const [selected, setSelected] = useState(sameCtx ? saved.selected || [] : []);
  const [invited, setInvited] = useState(sameCtx ? saved.invited || {} : {});
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [compat, setCompat] = useState(sameCtx ? saved.compat || null : null);
  const [compatState, setCompatState] = useState({ loading: false, error: null });
  const [viewing, setViewing] = useState(null);
  const [inviting, setInviting] = useState(null);
  const [invitingAll, setInvitingAll] = useState(false);
  const [banner, setBanner] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ eventId, description, result, selected, invited, compat })); } catch { /* ignore */ }
  }, [eventId, description, result, selected, invited, compat]);

  useEffect(() => {
    if (status !== 'loading') return undefined;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 1100);
    return () => clearInterval(t);
  }, [status]);

  const analyse = async (e) => {
    e?.preventDefault();
    const text = description.trim();
    if (text.length < 8) { setError('Tell us a little more about what you are building.'); setStatus('error'); return; }
    setStatus('loading');
    setError(null);
    setBanner(null);
    try {
      const data = await api.analyseTeam(text, event?.id);
      setResult(data);
      setSelected(data.matches.filter((m) => m.suggested).map((m) => m.studentId));
      setInvited({});
      setCompat(null);
      setStatus('idle');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      setError(err.status === 400 ? err.message : "We couldn't analyse your project right now. Please try again.");
      setStatus('error');
    }
  };

  const reset = () => { setResult(null); setSelected([]); setInvited({}); setCompat(null); setStatus('idle'); setError(null); setBanner(null); };

  const matchesById = useMemo(() => new Map((result?.matches || []).map((m) => [m.studentId, m])), [result]);
  const members = selected.map((id) => matchesById.get(id)).filter(Boolean);

  const teamDraft = useCallback((c = compat) => result && ({
    id: result.draftId,
    name: result.analysis.projectName,
    summary: result.analysis.projectSummary,
    tags: result.analysis.projectTags,
    roles: result.analysis.roles,
    eventId: result.event?.id || null,
    compatibility: c ? { overall: c.overall, metrics: c.metrics, explanation: c.explanation } : null,
  }), [result, compat]);

  // Recompute compatibility whenever the selected team changes (debounced).
  const selKey = selected.join(',');
  useEffect(() => {
    if (!result || !selected.length) { setCompatState({ loading: false, error: null }); return undefined; }
    if (compat && compat.key === selKey) return undefined;
    let alive = true;
    setCompatState({ loading: true, error: null });
    const t = setTimeout(async () => {
      try {
        const data = await api.teamCompatibility(result.analysis, selected, result.event?.id);
        if (!alive) return;
        const next = { ...data, key: selKey };
        setCompat(next);
        setCompatState({ loading: false, error: null });
        if (Object.keys(invited).length) api.updateTeam(result.draftId, teamDraft(next)).catch(() => {});
      } catch (err) {
        if (alive) setCompatState({ loading: false, error: err.message || 'Could not calculate compatibility.' });
      }
    }, 650);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, result]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const invite = async (m, quiet = false) => {
    setInviting(m.studentId);
    try {
      await api.invite(teamDraft(), m.studentId, m.role);
      setInvited((x) => ({ ...x, [m.studentId]: true }));
      if (!selected.includes(m.studentId)) setSelected((s) => [...s, m.studentId]);
      if (!quiet) {
        setBanner({ name: m.student.name.split(' ')[0], project: result.analysis.projectName });
        toast(`Invitation sent to ${m.student.name.split(' ')[0]}`);
      }
      return true;
    } catch (err) {
      toast(err.message || 'Could not send invitation', 'error');
      return false;
    } finally {
      setInviting(null);
    }
  };

  const allInvited = members.length > 0 && members.every((m) => invited[m.studentId]);
  const inviteAll = async () => {
    if (allInvited) { navigate('/team/mine'); return; }
    setInvitingAll(true);
    let ok = true;
    for (const m of members) if (!invited[m.studentId]) ok = (await invite(m, true)) && ok;
    setInvitingAll(false);
    if (ok) {
      toast(`Team saved. ${members.length} invitation${members.length > 1 ? 's' : ''} sent.`);
      navigate('/team/mine');
    }
  };

  return (
    <div>
      <header className="mb-6 animate-fade-in sm:mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AIBadge>AI Team Builder</AIBadge>
          <Link to="/team/mine" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-indigo-700"><Users className="h-3.5 w-3.5" />My Team</Link>
        </div>
        <h1 className="text-[36px] font-semibold leading-[1] tracking-[-0.035em] text-slate-900 sm:text-[52px]">Build your <span className="serif-accent text-indigo-600">team.</span></h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 sm:text-base">Tell us what you're building. CampusOne will figure out who you need, and who on campus fits.</p>
      </header>

      {event && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 animate-slide-up">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-200"><Trophy className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Building a team for</p>
            <p className="font-semibold text-slate-900">{event.title}</p>
            <p className="mt-0.5 text-sm text-slate-600">{[event.teamSize && `Team size: ${event.teamSize}`, (event.tags || []).slice(0, 3).join(' • ')].filter(Boolean).join(' · ')}</p>
          </div>
          <button onClick={() => { const p = new URLSearchParams(params); p.delete('event'); setParams(p); reset(); }} aria-label="Remove event context" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
      )}

      {status === 'loading' ? <Processing step={step} /> : (
        <form onSubmit={analyse} className="rounded-3xl border border-slate-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
          {event && <p className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold text-indigo-700"><Sparkles className="h-4 w-4" />What role do you need help with?</p>}
          <label htmlFor="tb-desc" className="sr-only">Describe your project</label>
          <textarea
            id="tb-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyse(e); }}
            rows={result ? 3 : 6}
            maxLength={3000}
            placeholder={event
              ? `e.g. We're entering ${event.title} with an idea for a campus accessibility assistant. I can do the Python/ML side. I need someone for the frontend and someone for design.`
              : `Tell us what you're building...\n\ne.g. I'm building an AI-powered medical image analysis platform. I'll train the model in PyTorch. I need a React developer for the dashboard and someone to design the doctor-facing UI.`}
            className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-2 pb-1 pt-2">
            {!description && <button type="button" onClick={() => setDescription(EXAMPLE)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50">Try an example</button>}
            {result && <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"><RotateCcw className="h-4 w-4" />Start over</button>}
            <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Ctrl + Enter</span>
            <Button type="submit" variant="ai" className="px-5"><Sparkles className="h-4 w-4" />{result ? 'Re-analyse' : 'Find My Team'}</Button>
          </div>
        </form>
      )}

      {status === 'error' && (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 animate-fade-in sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1"><p className="font-semibold">{error?.includes('analyse') ? "We couldn't analyse your project right now." : 'Almost there'}</p><p className="text-sm">{error?.includes('analyse') ? 'Please try again.' : error}</p></div>
          {error?.includes('analyse') && <Button variant="secondary" onClick={analyse}><RotateCcw className="h-4 w-4" />Try again</Button>}
        </div>
      )}

      {result && status !== 'loading' && (
        <div ref={resultsRef} className="mt-8 scroll-mt-6 space-y-8">
          {result.matches.length > 0 && (
            <section className="surface p-5 sm:p-8 animate-slide-up">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
                <div><p className="eyebrow">How your team comes together</p><p className="mt-1 text-sm text-slate-500">Project → roles it needs → people who fill them. Hover to trace a path.</p></div>
              </div>
              <TeamGraph analysis={result.analysis} matches={result.matches} selected={selected} user={user} onView={setViewing} />
            </section>
          )}
          <Requirements analysis={result.analysis} event={result.event} />

          {banner && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-scale-in" role="status">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-5 w-5" /></div>
              <div className="flex-1"><p className="font-semibold text-emerald-900">Invitation sent ✓</p><p className="text-sm text-emerald-800">{banner.name} has been invited to join your {banner.project} team.</p></div>
              <Link to="/team/mine" className="hidden rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 sm:block">My Team</Link>
              <button onClick={() => setBanner(null)} aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-100"><X className="h-4 w-4" /></button>
            </div>
          )}

          {result.matches.length === 0 ? (
            <EmptyState icon={Users} title="We couldn't find a strong match yet." text="Try expanding your required skills or check back as more students join CampusOne." action={<Button variant="secondary" onClick={() => document.getElementById('tb-desc')?.focus()}>Edit description</Button>} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <section>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Your Recommended Team</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Ranked from {result.poolSize} CampusOne profiles for: {result.neededRoles.join(', ')}.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.matches.map((m, i) => (
                    <MatchCard key={m.studentId} m={m} index={i} selected={selected.includes(m.studentId)} invited={invited[m.studentId]}
                      onToggle={() => toggle(m.studentId)} onView={() => setViewing(m)} onInvite={() => invite(m)} inviting={inviting === m.studentId} />
                  ))}
                </div>
                {result.matches.some((m) => m.student.demo) && <p className="mt-3 text-xs text-slate-400">Profiles marked "Demo profile" are fictional sample students used to demonstrate matching.</p>}
              </section>
              <div className="xl:sticky xl:top-6 xl:self-start">
                <Compatibility user={user} members={members} compat={compat} loading={compatState.loading} error={compatState.error}
                  onInviteAll={inviteAll} invitingAll={invitingAll} allInvited={allInvited} />
              </div>
            </div>
          )}
        </div>
      )}

      {viewing && (
        <StudentProfileModal studentId={viewing.studentId} initial={viewing.student} onClose={() => setViewing(null)}
          actions={() => (invited[viewing.studentId]
            ? <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CircleCheck className="h-4 w-4" />Invited</span>
            : <Button onClick={async () => { if (await invite(viewing)) setViewing(null); }}><UserPlus className="h-4 w-4" />Invite as {viewing.role}</Button>)} />
      )}
    </div>
  );
}

export default function TeamBuilder() {
  return (
    <RequireAuth title="Find your teammates" text="Sign in to personalise your campus experience and find teammates for your next project." icon={Handshake}>
      <Builder />
    </RequireAuth>
  );
}
