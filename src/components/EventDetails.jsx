import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollLock } from '../lib/scrollLock.js';
import { CalendarDays, Clock, MapPin, Users, Trophy, GraduationCap, Ticket, Building2, Sparkles, Check, Share2, X, AlarmClock, Wifi, Handshake, ArrowRight } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { CategoryChip, DeadlineBadge, Tag, Button } from './ui.jsx';
import { formatLong, deadlineInfo } from '../lib/dates.js';

function Detail({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70"><Icon className="h-4 w-4" aria-hidden /></div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  );
}

// Local "why useful" reasoning when Claude hasn't ranked this event.
function localReason(event, prefs) {
  const text = [event.title, event.description, ...(event.tags || [])].join(' ').toLowerCase();
  const hits = (prefs.interests || []).filter((i) => i.toLowerCase().split(/[\s/]+/).some((w) => w.length > 1 && text.includes(w)));
  const bits = [];
  if (hits.length) bits.push(`it lines up with your interest in ${hits.join(' and ')}`);
  if (event.category === 'Hackathon' && prefs.goals?.includes('Win hackathons')) bits.push('it helps your goal to win hackathons');
  if (event.category === 'Workshop' && (prefs.goals?.includes('Learn skills') || prefs.goals?.includes('Learn new skills'))) bits.push("it's a hands-on way to learn new skills");
  if (event.category === 'Internship' && prefs.goals?.includes('Find internships')) bits.push('it moves you closer to an internship');
  if (event.category === 'Club' && (prefs.goals?.includes('Meet students') || prefs.goals?.includes('Meet other students') || prefs.goals?.includes('Join clubs'))) bits.push("it's a great way to meet like-minded students");
  if (!bits.length) return 'Something a little outside your usual interests. A good way to broaden your campus experience.';
  return `Worth a look because ${bits.join(', and ')}.`;
}

export default function EventDetails() {
  const { selectedEvent: e, closeEvent, registered, toggleRegister, recById, preferences, toast, requireAuth } = useApp();
  const dialogRef = useRef(null);
  const navigate = useNavigate();

  useScrollLock(Boolean(e));
  useEffect(() => {
    if (!e) return undefined;
    const onKey = (ev) => ev.key === 'Escape' && closeEvent();
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener('keydown', onKey);
  }, [e, closeEvent]);

  if (!e) return null;
  const rec = recById.get(e.id);
  const isReg = registered.includes(e.id);
  const dl = deadlineInfo(e.registrationDeadline);
  const closed = dl?.level === 'closed';
  const teamEvent = ['Hackathon', 'Competition'].includes(e.category) && !/^individual/i.test(e.teamSize || '') && !closed;
  const findTeammates = () => {
    const to = `/team?event=${encodeURIComponent(e.id)}`;
    requireAuth(() => { closeEvent(); navigate(to); }, { returnTo: to, reason: `Sign in to find teammates for ${e.title}. CampusOne will match you with students who have the skills your team needs.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={closeEvent} />
      <div ref={dialogRef} tabIndex={-1} className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none animate-scale-in sm:rounded-3xl">
        {/* Header band */}
        <div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-white px-6 pb-5 pt-6">
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={e.category} />
              {e.registrationDeadline && <DeadlineBadge date={e.registrationDeadline} />}
            </div>
            <button onClick={closeEvent} aria-label="Close details" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-slate-500 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900">
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 id="event-title" className="relative mt-4 text-2xl font-bold tracking-tight text-slate-900">{e.title}</h2>
          <p className="relative mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500"><Building2 className="h-4 w-4" /> {e.organizer}</p>
        </div>

        {/* Body */}
        <div className="overlay-scroll px-6 py-5">
          {e.description && <p className="text-[15px] leading-relaxed text-slate-600">{e.description}</p>}

          <div className="mt-5 rounded-2xl ai-glow bg-gradient-to-br from-indigo-50/80 to-violet-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Why this might be useful for you
              {rec && <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">{rec.score}% match</span>}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-indigo-950/80">{rec ? rec.reason : localReason(e, preferences)}</p>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Detail icon={CalendarDays} label="Date" value={e.date ? formatLong(e.date) : null} />
            <Detail icon={Clock} label="Time" value={e.time} />
            <Detail icon={e.mode === 'Online' ? Wifi : MapPin} label={`Venue${e.mode ? ` · ${e.mode}` : ''}`} value={e.location} />
            <Detail icon={AlarmClock} label="Registration deadline" value={e.registrationDeadline ? `${formatLong(e.registrationDeadline)}${dl ? ` (${dl.short.toLowerCase()})` : ''}` : null} />
            <Detail icon={GraduationCap} label="Eligibility" value={e.eligibility} />
            <Detail icon={Users} label="Team size" value={e.teamSize} />
            <Detail icon={Trophy} label="Prize / Stipend" value={e.prize} />
            <Detail icon={Ticket} label="Fee" value={e.fee} />
          </div>

          {teamEvent && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"><Handshake className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Don't have a team?</p>
                <p className="text-[13px] text-slate-500">Claude figures out the roles you need{e.teamSize ? ` (${e.teamSize})` : ''} and matches you with students.</p>
              </div>
              <Button variant="secondary" onClick={findTeammates} className="shrink-0"><Handshake className="h-4 w-4 text-indigo-600" />Find Teammates<ArrowRight className="h-4 w-4 text-slate-400" /></Button>
            </div>
          )}

          {e.tags?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">{e.tags.map((t) => <Tag key={t}>#{t}</Tag>)}</div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <Button variant="secondary" className="px-3" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(e.registrationLink || window.location.href); toast('Link copied to clipboard', 'info'); }}>
            <Share2 className="h-4 w-4" />
          </Button>
          {e.category === 'Announcement' ? (
            <Button className="flex-1" onClick={closeEvent}>Got it</Button>
          ) : closed ? (
            <Button className="flex-1" disabled>Registration closed</Button>
          ) : (
            <Button variant={isReg ? 'success' : 'ai'} className="flex-1 py-3 text-[15px]" onClick={() => toggleRegister(e.id)}>
              {isReg ? <><Check className="h-5 w-5" /> You're registered</> : 'Register Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
