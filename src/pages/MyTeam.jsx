import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Handshake, Sparkles, Clock3, CircleCheck, XCircle, Trash2, Mail, Trophy, RefreshCw, Check, X } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { RequireAuth, Avatar } from '../components/auth.jsx';
import { DemoBadge, StudentProfileModal } from '../components/profile.jsx';
import { Button, EmptyState, PageHeader } from '../components/ui.jsx';
import { ScoreRing } from './TeamBuilder.jsx';

const STATUS = {
  pending: { label: 'Pending', icon: Clock3, cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Joined', icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  declined: { label: 'Declined', icon: XCircle, cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

function MemberRow({ name, picture, role, skills, demo, badge, onView }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
      <Avatar name={name} src={picture} size={42} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {onView ? <button onClick={onView} className="truncate font-semibold text-slate-900 hover:text-indigo-700">{name}</button> : <span className="truncate font-semibold text-slate-900">{name}</span>}
          {demo && <DemoBadge />}
        </div>
        <p className="truncate text-[13px] text-slate-500">{[role, (skills || []).slice(0, 3).join(' / ')].filter(Boolean).join(' · ')}</p>
      </div>
      {badge}
    </div>
  );
}

function TeamCard({ team, user, onDelete, onView }) {
  const accepted = team.members || [];
  const invites = team.invitations || [];
  const pending = invites.filter((i) => i.status !== 'accepted');
  const ownerRoles = team.roles.filter((r) => r.coveredByRequester).map((r) => r.role).join(' / ');
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white animate-slide-up">
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{team.isOwner ? 'Your project' : 'Team you joined'}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{team.name}</h2>
            {team.summary && <p className="mt-1 text-sm text-slate-500">{team.summary}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">{(team.tags || []).map((t) => <span key={t} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{t}</span>)}</div>
          </div>
          {team.compatibility?.overall > 0 && (
            <div className="flex flex-col items-center"><ScoreRing value={team.compatibility.overall} size={84} stroke={7} /><span className="mt-1 text-[11px] font-semibold text-slate-500">Team Compatibility</span></div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Team members</h3>
          <div className="space-y-2">
            {team.isOwner
              ? <MemberRow name={`${user.name} (you)`} picture={user.picture} role={ownerRoles || 'Project lead'} skills={user.skills} />
              : team.owner && <MemberRow name={team.owner.name} picture={team.owner.picture} role="Project lead" skills={team.owner.skills} demo={team.owner.demo} />}
            {accepted.map((m) => <MemberRow key={m.studentId} name={m.studentId === user.id ? `${m.student.name} (you)` : m.student.name} picture={m.student.picture} role={m.role} skills={m.student.skills} demo={m.student.demo} onView={m.studentId !== user.id ? () => onView(m.studentId) : null} />)}
          </div>
          {team.roles?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {team.roles.map((r) => <span key={r.role} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${r.coveredByRequester ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{r.role}</span>)}
            </div>
          )}
        </div>
        {team.isOwner && (
          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Invitations</h3>
            {pending.length ? (
              <div className="space-y-2">
                {pending.map((i) => {
                  const s = STATUS[i.status] || STATUS.pending;
                  const Icon = s.icon;
                  return <MemberRow key={i.id} name={i.student.name} picture={i.student.picture} role={i.role} skills={i.student.skills} demo={i.student.demo} onView={() => onView(i.student.id)}
                    badge={<span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ring-1 ring-inset ${s.cls}`}><Icon className="h-3.5 w-3.5" />{s.label}</span>} />;
                })}
              </div>
            ) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No pending invitations.</p>}
          </div>
        )}
      </div>
      {team.compatibility?.explanation && (
        <div className="mx-6 mb-6 rounded-2xl ai-glow bg-gradient-to-br from-indigo-50/80 to-violet-50/80 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900"><Sparkles className="h-4 w-4 text-indigo-500" />Why this team works</p>
          <p className="mt-1 text-sm leading-relaxed text-indigo-950/80">{team.compatibility.explanation}</p>
        </div>
      )}
      {team.isOwner && (
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-3">
          <span className="text-xs text-slate-400">Created {new Date(team.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
          <button onClick={() => onDelete(team)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete team</button>
        </div>
      )}
    </article>
  );
}

function MyTeamView() {
  const { user, toast } = useApp();
  const [state, setState] = useState({ loading: true, teams: [], received: [], error: null });
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const d = await api.myTeams();
      setState({ loading: false, teams: d.teams, received: d.received, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const respond = async (inv, accept) => {
    try {
      await api.respondInvite(inv.id, accept);
      toast(accept ? `You joined ${inv.team.name}` : 'Invitation declined', accept ? 'success' : 'info');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };
  const remove = async (team) => {
    if (!window.confirm(`Delete "${team.name}" and its invitations?`)) return;
    try { await api.deleteTeam(team.id); toast('Team deleted', 'info'); load(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="My Team" subtitle="Your project teams, members and pending invitations."
        badge={<Link to="/team" className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70"><Handshake className="h-3.5 w-3.5" />Team Builder</Link>}>
        <div className="mt-4 flex gap-2">
          <Link to="/team"><Button variant="ai"><Sparkles className="h-4 w-4" />Build a new team</Button></Link>
          <Button variant="secondary" onClick={load} aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </PageHeader>

      {state.received.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"><Mail className="h-5 w-5 text-indigo-600" />Invitations for you</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {state.received.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 rounded-2xl ai-glow bg-gradient-to-br from-indigo-50/70 to-violet-50/70 p-4 animate-slide-up">
                <div className="flex items-center gap-3">
                  {inv.from && <Avatar name={inv.from.name} src={inv.from.picture} size={40} />}
                  <div className="min-w-0"><p className="text-sm text-slate-600"><strong className="text-slate-900">{inv.from?.name || 'A student'}</strong> invited you to join</p><p className="font-semibold text-slate-900">{inv.team.name}{inv.role && <span className="font-normal text-slate-500"> as {inv.role}</span>}</p></div>
                </div>
                <div className="flex gap-2"><Button className="flex-1" onClick={() => respond(inv, true)}><Check className="h-4 w-4" />Accept</Button><Button variant="secondary" onClick={() => respond(inv, false)}><X className="h-4 w-4" />Decline</Button></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><p className="font-semibold">Couldn't load your teams</p><p className="text-sm">{state.error}</p><Button className="mt-3" onClick={load}>Try again</Button></div>
      ) : state.loading && !state.teams.length ? (
        <div className="space-y-4"><div className="skeleton h-56 w-full rounded-3xl" /></div>
      ) : state.teams.length ? (
        <div className="space-y-6">{state.teams.map((t) => <TeamCard key={t.id} team={t} user={user} onDelete={remove} onView={setViewing} />)}</div>
      ) : (
        <EmptyState icon={Users} title="No teams yet" text="Describe your project and Claude will figure out the roles you need, then match you with students who fit."
          action={<Link to="/team"><Button variant="ai"><Trophy className="h-4 w-4" />Build My Team</Button></Link>} />
      )}
      {viewing && <StudentProfileModal studentId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

export default function MyTeam() {
  return <RequireAuth title="Your teams" text="Sign in to see your teams and invitations." icon={Users}><MyTeamView /></RequireAuth>;
}
