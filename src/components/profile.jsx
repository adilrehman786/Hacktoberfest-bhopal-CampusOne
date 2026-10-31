import { useEffect, useState } from 'react';
import { Check, Plus, X, CalendarClock, FolderGit2, Trophy, Target, Heart, Code2, LoaderCircle } from 'lucide-react';
import { INTERESTS, GOALS, AVAILABILITY, SKILL_SUGGESTIONS } from '../lib/categories.js';
import { api } from '../services/api.js';
import { useScrollLock } from '../lib/scrollLock.js';
import { Avatar } from './auth.jsx';

export function ChipSelect({ options, selected, onToggle, size = 'md' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)}
            className={`inline-flex items-center gap-1.5 rounded-xl font-medium transition active:scale-95 ${size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-3.5 py-2 text-sm'} ${on ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-indigo-300'}`}>
            {on && <Check className="h-4 w-4" />}{o}
          </button>
        );
      })}
    </div>
  );
}

export const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function SkillPill({ children, tone = 'slate', onRemove }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/70',
    emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${children}`} className="-mr-1 rounded p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100"><X className="h-3 w-3" /></button>}
    </span>
  );
}

/** Pick from suggestions or type your own skills. */
export function SkillInput({ value, onChange }) {
  const [text, setText] = useState('');
  const add = (raw) => {
    const s = raw.trim().replace(/,$/, '');
    if (!s || value.some((v) => v.toLowerCase() === s.toLowerCase()) || value.length >= 25) return;
    onChange([...value, s.slice(0, 40)]);
  };
  const suggestions = SKILL_SUGGESTIONS.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((s) => <SkillPill key={s} tone="indigo" onRemove={() => onChange(value.filter((x) => x !== s))}>{s}</SkillPill>)}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); setText(''); } }}
          placeholder="Type a skill and press Enter, e.g. Django"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
        <button type="button" onClick={() => { add(text); setText(''); }} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-indigo-600"><Plus className="h-4 w-4" />Add</button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 14).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:text-indigo-700 hover:ring-indigo-300">
              <Plus className="h-3 w-3" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FormSection({ icon: Icon, title, hint, children }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">{Icon && <Icon className="h-5 w-5 text-indigo-600" />}{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const PROFILE_OPTIONS = { INTERESTS, GOALS, AVAILABILITY };

/** Read-only profile body, shared by My Profile and teammate profiles. */
export function ProfileDetails({ p }) {
  const Block = ({ icon: Icon, title, children }) => (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Icon className="h-3.5 w-3.5" />{title}</h3>
      {children}
    </div>
  );
  const none = <p className="text-sm text-slate-400">Not added yet</p>;
  return (
    <div className="space-y-6">
      <Block icon={Code2} title="Skills">
        {p.skills?.length ? <div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <SkillPill key={s} tone="indigo">{s}</SkillPill>)}</div> : none}
      </Block>
      <div className="grid gap-6 sm:grid-cols-2">
        <Block icon={Heart} title="Interests">
          {p.interests?.length ? <div className="flex flex-wrap gap-1.5">{p.interests.map((s) => <SkillPill key={s}>{s}</SkillPill>)}</div> : none}
        </Block>
        <Block icon={Target} title="Goals">
          {p.goals?.length ? <ul className="space-y-1">{p.goals.map((g) => <li key={g} className="flex items-center gap-2 text-sm text-slate-700"><Check className="h-4 w-4 text-emerald-500" />{g}</li>)}</ul> : none}
        </Block>
      </div>
      <Block icon={CalendarClock} title="Availability">
        {p.availability?.length ? <div className="flex flex-wrap gap-1.5">{p.availability.map((s) => <SkillPill key={s} tone="emerald">{s}</SkillPill>)}</div> : none}
      </Block>
      <Block icon={FolderGit2} title="Projects">
        {p.projects?.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {p.projects.map((pr) => (
              <div key={pr.name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="text-sm font-semibold text-slate-900">{pr.name}</div>
                {pr.description && <p className="mt-0.5 text-[13px] text-slate-500">{pr.description}</p>}
                {pr.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{pr.tags.map((t) => <span key={t} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">{t}</span>)}</div>}
              </div>
            ))}
          </div>
        ) : none}
      </Block>
      <Block icon={Trophy} title="Hackathon participation">
        {p.hackathons?.length ? <ul className="space-y-1">{p.hackathons.map((h) => <li key={h} className="flex items-center gap-2 text-sm text-slate-700"><Trophy className="h-3.5 w-3.5 text-amber-500" />{h}</li>)}</ul> : none}
      </Block>
    </div>
  );
}

export function DemoBadge() {
  return <span title="Fictional sample profile used to demonstrate matching" className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">Demo profile</span>;
}

/** Public teammate profile (no email). */
export function StudentProfileModal({ studentId, initial, onClose, actions }) {
  const [student, setStudent] = useState(initial || null);
  const [error, setError] = useState(null);
  useScrollLock(Boolean(studentId));
  useEffect(() => {
    if (!studentId) return undefined;
    let alive = true;
    setError(null);
    api.student(studentId).then((d) => alive && setStudent(d.student)).catch((e) => alive && !initial && setError(e.message));
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => { alive = false; document.removeEventListener('keydown', onKey); };
  }, [studentId, initial, onClose]);
  if (!studentId) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Student profile">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-scale-in sm:rounded-3xl">
        <div className="relative shrink-0 border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-6">
          <button onClick={onClose} aria-label="Close profile" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-slate-500 ring-1 ring-slate-200 hover:text-slate-900"><X className="h-5 w-5" /></button>
          {student ? (
            <div className="flex items-center gap-4 pr-10">
              <Avatar name={student.name} src={student.picture} size={64} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold tracking-tight text-slate-900">{student.name}</h2>{student.demo && <DemoBadge />}</div>
                <p className="text-sm text-slate-500">{[student.year, student.interests?.slice(0, 3).join(' • ')].filter(Boolean).join(' · ')}</p>
                {student.headline && <p className="mt-1 text-sm text-slate-600">{student.headline}</p>}
              </div>
            </div>
          ) : error ? <p className="text-sm text-red-600">{error}</p> : <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading profile…</div>}
        </div>
        {student && <div className="overlay-scroll px-6 py-5"><ProfileDetails p={student} /></div>}
        {student && actions && <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">{actions(student)}</div>}
      </div>
    </div>
  );
}
