import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Heart, Target, Code2, CalendarClock, FolderGit2, Trophy, User, ShieldCheck, Plus, Trash2, LogOut, LoaderCircle, Handshake, Eye } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { Avatar, RequireAuth } from '../components/auth.jsx';
import { ChipSelect, SkillInput, FormSection, ProfileDetails, toggleIn, PROFILE_OPTIONS } from '../components/profile.jsx';
import { Button } from '../components/ui.jsx';
import ProfileInsights from '../components/ProfileInsights.jsx';

const input = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100';

function EditProfile({ onDone }) {
  const { user, saveProfile, toast } = useApp();
  const [d, setD] = useState({
    name: user.name || '', year: user.year || '', headline: user.headline || '',
    interests: user.interests || [], goals: user.goals || [], skills: user.skills || [], availability: user.availability || [],
    projects: user.projects?.length ? user.projects.map((p) => ({ ...p, tags: (p.tags || []).join(', ') })) : [],
    hackathons: user.hackathons || [], discoverable: user.discoverable !== false,
  });
  const [hack, setHack] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setD((x) => ({ ...x, [k]: toggleIn(x[k], v) }));
  const setProject = (i, k, v) => setD((x) => ({ ...x, projects: x.projects.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile({
        ...d,
        projects: d.projects.filter((p) => p.name.trim()).map((p) => ({ ...p, tags: p.tags.split(',').map((t) => t.trim()).filter(Boolean) })),
      });
      toast('Profile updated');
      onDone();
    } catch (err) {
      toast(err.message || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <FormSection icon={User} title="Basics">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-500">Name<input className={`${input} mt-1`} value={d.name} required maxLength={80} onChange={(e) => setD({ ...d, name: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">Year
            <select className={`${input} mt-1 bg-white`} value={d.year} onChange={(e) => setD({ ...d, year: e.target.value })}>
              <option value="">Prefer not to say</option>
              {['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'].map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Headline<input className={`${input} mt-1`} value={d.headline} maxLength={160} placeholder="e.g. ML enthusiast who loves building with React" onChange={(e) => setD({ ...d, headline: e.target.value })} /></label>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
          <input type="checkbox" checked={d.discoverable} onChange={(e) => setD({ ...d, discoverable: e.target.checked })} className="mt-0.5 h-4 w-4 accent-indigo-600" />
          <span className="text-sm"><span className="font-semibold text-slate-800">Show me in Team Builder</span><span className="block text-slate-500">Other students can find you as a teammate. Your email is never shown.</span></span>
        </label>
      </FormSection>
      <FormSection icon={Code2} title="Skills"><SkillInput value={d.skills} onChange={(skills) => setD({ ...d, skills })} /></FormSection>
      <FormSection icon={Heart} title="Interests"><ChipSelect size="sm" options={PROFILE_OPTIONS.INTERESTS} selected={d.interests} onToggle={set('interests')} /></FormSection>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <FormSection icon={Target} title="Goals"><ChipSelect size="sm" options={PROFILE_OPTIONS.GOALS} selected={d.goals} onToggle={set('goals')} /></FormSection>
        <FormSection icon={CalendarClock} title="Availability"><ChipSelect size="sm" options={PROFILE_OPTIONS.AVAILABILITY} selected={d.availability} onToggle={set('availability')} /></FormSection>
      </div>
      <FormSection icon={FolderGit2} title="Projects" hint="Relevant projects improve your Team Builder matches.">
        <div className="space-y-3">
          {d.projects.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_auto]">
              <input className={input} placeholder="Project name" value={p.name} onChange={(e) => setProject(i, 'name', e.target.value)} />
              <input className={input} placeholder="Tech / tags, comma separated" value={p.tags} onChange={(e) => setProject(i, 'tags', e.target.value)} />
              <button type="button" aria-label="Remove project" onClick={() => setD({ ...d, projects: d.projects.filter((_, j) => j !== i) })} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              <input className={`${input} sm:col-span-3`} placeholder="One-line description" value={p.description} onChange={(e) => setProject(i, 'description', e.target.value)} />
            </div>
          ))}
          <button type="button" onClick={() => setD({ ...d, projects: [...d.projects, { name: '', description: '', tags: '' }] })} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"><Plus className="h-4 w-4" />Add project</button>
        </div>
      </FormSection>
      <FormSection icon={Trophy} title="Hackathon participation">
        <div className="flex flex-wrap gap-1.5">
          {d.hackathons.map((h) => <span key={h} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{h}<button type="button" aria-label={`Remove ${h}`} onClick={() => setD({ ...d, hackathons: d.hackathons.filter((x) => x !== h) })}><Trash2 className="h-3 w-3" /></button></span>)}
        </div>
        <div className="mt-3 flex gap-2">
          <input className={input} value={hack} placeholder="e.g. Campus AI Hackathon 2025 (finalist)" onChange={(e) => setHack(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (hack.trim()) { setD({ ...d, hackathons: [...d.hackathons, hack.trim()] }); setHack(''); } } }} />
          <button type="button" onClick={() => { if (hack.trim()) { setD({ ...d, hackathons: [...d.hackathons, hack.trim()] }); setHack(''); } }} className="rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-indigo-600">Add</button>
        </div>
      </FormSection>
      <div className="sticky bottom-20 flex items-center justify-end gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="ai" disabled={saving}>{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Save profile</Button>
      </div>
    </form>
  );
}

function ProfileView() {
  const { user, signOut } = useApp();
  const [editing, setEditing] = useState(false);
  return (
    <div className="mx-auto max-w-4xl">
      <section className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e3e3de 1px, transparent 0)', backgroundSize: '22px 22px', maskImage: 'linear-gradient(to left, black, transparent 60%)', WebkitMaskImage: 'linear-gradient(to left, black, transparent 60%)' }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.name} src={user.picture} size={80} className="shadow-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{user.name}</h1>
            <p className="mt-1 text-[15px] font-medium text-indigo-600">{[...(user.interests || []).slice(0, 3), (user.goals || []).includes('Win hackathons') && 'Hackathons'].filter(Boolean).join(' • ') || 'CampusOne student'}</p>
            {user.headline && <p className="mt-1 text-sm text-slate-600">{user.headline}</p>}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              {user.year && <span>{user.year}</span>}
              {user.email && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />{user.email} (only visible to you)</span>}
              <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{user.discoverable !== false ? 'Visible in Team Builder' : 'Hidden from Team Builder'}</span>
            </p>
          </div>
          {!editing && (
            <div className="flex gap-2 sm:flex-col">
              <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit profile</Button>
              <Button variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button>
            </div>
          )}
        </div>
      </section>
      {editing ? <EditProfile onDone={() => setEditing(false)} /> : (
        <>
          <ProfileInsights onEdit={() => { setEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          <section className="surface mt-4 p-6 sm:p-8"><p className="eyebrow mb-5">Identity</p><ProfileDetails p={user} /></section>
          <Link to="/team" className="group mt-5 flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-indigo-200 hover:shadow-md">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"><Handshake className="h-5 w-5" /></div>
            <div className="flex-1"><div className="font-semibold text-slate-900">Build a team with these skills</div><div className="text-sm text-slate-500">Describe your project and CampusOne finds who you need.</div></div>
          </Link>
        </>
      )}
    </div>
  );
}

export default function Profile() {
  return <RequireAuth title="Your CampusOne profile" text="Sign in to create your student profile and get matched with teammates."><ProfileView /></RequireAuth>;
}
