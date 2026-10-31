import { useEffect, useState } from 'react';
import { Wand2, Sparkles, Check, Pencil, AlertTriangle, CalendarDays, Clock, MapPin, Users, Trophy, GraduationCap, AlarmClock, Building2, Ticket, Plus, RotateCcw, MessageSquareText, FileText } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { CategoryChip, Tag, Button, AIBadge, PageHeader } from '../components/ui.jsx';
import { formatLong, deadlineInfo } from '../lib/dates.js';

const EXAMPLES = [
  {
    label: 'WhatsApp forward',
    icon: MessageSquareText,
    text: `guys coding club is organising 24 hour hackathon on 15 nov!!
in auditorium. teams 2-4 members
register before 12 nov!! prizes 20k + goodies
open for all branches, food will be provided
dm rahul for queries`,
  },
  {
    label: 'Club notice',
    icon: FileText,
    text: `*DESIGN COLLECTIVE x E-CELL*
Figma for Founders, hands on workshop!!
learn to prototype ur startup idea in 3 hrs
venue: Seminar Hall 2 | sat 4pm
only 60 seats, ₹99 per head, first years welcome
reg closes thursday midnight, link in bio`,
  },
  {
    label: 'Placement email',
    icon: Building2,
    text: `Dear Students, The Training & Placement Cell is pleased to announce that Zentrix Analytics will be conducting a campus hiring drive for Data Analyst Interns (6 months, stipend Rs 35,000/month). Eligible: 2027 batch, CSE/IT/ECE, min 7.5 CGPA, no active backlogs. Online test on 20th November 2026 at 10 AM. Interested students must register on the placement portal latest by 14/11/2026. Regards, TPO`,
  },
];

const STEPS = ['Reading announcement…', 'Extracting event details…', 'Resolving dates & deadlines…', 'Organising your opportunity…'];
const CATS = ['Hackathon', 'Event', 'Workshop', 'Competition', 'Club', 'Internship', 'Scholarship', 'Announcement', 'Seminar'];
const EMPTY = { title: '', category: 'Event', description: '', date: '', time: '', location: '', registrationDeadline: '', eligibility: '', teamSize: '', prize: '', fee: '', organizer: '', tags: [] };

function LoadingSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rounded-3xl ai-glow bg-white p-6 shadow-sm animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">Claude is organising this</div>
          <div className="text-sm text-slate-500">Turning unstructured text into a structured opportunity</div>
        </div>
      </div>
      <ol className="mt-5 space-y-2.5">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i <= step ? 'text-slate-800' : 'text-slate-300'}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full transition-colors ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100'}`}>
              {i < step ? <Check className="h-3 w-3" /> : i === step ? <span className="h-1.5 w-1.5 animate-ping rounded-full bg-indigo-500" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-6 space-y-2"><div className="skeleton h-6 w-2/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-5/6" /></div>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${value ? 'text-indigo-500' : 'text-slate-300'}`} aria-hidden />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`text-sm ${value ? 'font-medium text-slate-800' : 'italic text-slate-400'}`}>{value || 'Not mentioned'}</div>
      </div>
    </div>
  );
}

function Preview({ ev, meta }) {
  const dl = deadlineInfo(ev.registrationDeadline);
  return (
    <div className="animate-scale-in overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60">
      <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CategoryChip category={ev.category} />
          {meta?.confidence != null && <AIBadge>{meta.confidence}% confidence</AIBadge>}
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{ev.title || 'Untitled event'}</h2>
        {ev.organizer && <p className="mt-1 text-sm font-medium text-slate-500">by {ev.organizer}</p>}
        {ev.description && <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{ev.description}</p>}
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <Field icon={CalendarDays} label="Date" value={ev.date ? formatLong(ev.date) : null} />
        <Field icon={Clock} label="Time" value={ev.time} />
        <Field icon={MapPin} label="Location" value={ev.location} />
        <Field icon={AlarmClock} label="Register by" value={ev.registrationDeadline ? `${formatLong(ev.registrationDeadline)}${dl && dl.level !== 'later' ? ` · ${dl.short}` : ''}` : null} />
        <Field icon={Users} label="Team size" value={ev.teamSize} />
        <Field icon={Trophy} label="Prize" value={ev.prize} />
        <Field icon={GraduationCap} label="Eligibility" value={ev.eligibility} />
        <Field icon={Ticket} label="Fee" value={ev.fee} />
      </div>
      {ev.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 px-6 pb-5">{ev.tags.map((t) => <Tag key={t}>#{t}</Tag>)}</div>}
      {meta?.missingFields?.length > 0 && (
        <div className="mx-6 mb-6 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 ring-1 ring-amber-200/70">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Claude didn't invent missing details. Not in the announcement: <strong className="font-semibold">{meta.missingFields.join(', ')}</strong>. You can add them with Edit.</span>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', textarea, className = '' }) {
  const id = `f-${label.replace(/\W/g, '')}`;
  const cls = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100';
  return (
    <div className={className}>
      <label htmlFor={id} className="text-xs font-semibold text-slate-500">{label}</label>
      {textarea
        ? <textarea id={id} rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} className={cls} />
        : <input id={id} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className={cls} />}
    </div>
  );
}

function EditForm({ ev, setEv }) {
  const set = (k) => (v) => setEv((e) => ({ ...e, [k]: v }));
  return (
    <div className="grid gap-3 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm animate-fade-in sm:grid-cols-2">
      <Input label="Title *" value={ev.title} onChange={set('title')} className="sm:col-span-2" />
      <div>
        <label htmlFor="f-cat" className="text-xs font-semibold text-slate-500">Category</label>
        <select id="f-cat" value={ev.category} onChange={(e) => set('category')(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100">
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <Input label="Organiser" value={ev.organizer} onChange={set('organizer')} />
      <Input label="Description" value={ev.description} onChange={set('description')} textarea className="sm:col-span-2" />
      <Input label="Event date" type="date" value={ev.date} onChange={set('date')} />
      <Input label="Time" value={ev.time} onChange={set('time')} />
      <Input label="Location" value={ev.location} onChange={set('location')} />
      <Input label="Registration deadline" type="date" value={ev.registrationDeadline} onChange={set('registrationDeadline')} />
      <Input label="Team size" value={ev.teamSize} onChange={set('teamSize')} />
      <Input label="Prize" value={ev.prize} onChange={set('prize')} />
      <Input label="Eligibility" value={ev.eligibility} onChange={set('eligibility')} />
      <Input label="Fee" value={ev.fee} onChange={set('fee')} />
      <Input label="Tags (comma separated)" value={(ev.tags || []).join(', ')} onChange={(v) => set('tags')(v.split(',').map((t) => t.trim()).filter(Boolean))} className="sm:col-span-2" />
    </div>
  );
}

export default function Organise() {
  const { addEvent, toast, openEvent } = useApp();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error | saved
  const [error, setError] = useState(null);
  const [ev, setEv] = useState(null);
  const [meta, setMeta] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState('ai');

  const organise = async () => {
    if (!text.trim()) return;
    setStatus('loading');
    setError(null);
    setEditing(false);
    try {
      const { event } = await api.organise(text);
      const { confidence, missingFields, ...rest } = event;
      const clean = Object.fromEntries(Object.entries({ ...EMPTY, ...rest }).map(([k, v]) => [k, v ?? (k === 'tags' ? [] : '')]));
      setEv(clean);
      setMeta({ confidence, missingFields });
      setSource('ai');
      setStatus('done');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  };

  const addManually = () => {
    setEv({ ...EMPTY, description: text.trim().slice(0, 600) });
    setMeta(null);
    setSource('manual');
    setEditing(true);
    setStatus('done');
  };

  const save = async () => {
    if (!ev.title?.trim()) { toast('Please add a title first', 'error'); setEditing(true); return; }
    setSaving(true);
    try {
      const saved = await addEvent({ ...ev, source });
      setStatus('saved');
      toast(`"${saved.title}" added to CampusOne`);
      setTimeout(() => openEvent(saved.id), 350);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setText(''); setEv(null); setMeta(null); setStatus('idle'); setEditing(false); };

  return (
    <div>
      <PageHeader
        badge={<AIBadge>AI Organise · Powered by Claude</AIBadge>}
        title="Turn messy announcements into organised opportunities."
        subtitle="Paste anything: a WhatsApp forward, a poster's text or a club email. Claude extracts the details and never invents what isn't there."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <label htmlFor="announcement" className="text-sm font-semibold text-slate-900">Campus announcement</label>
            <textarea
              id="announcement"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              placeholder="Paste a campus announcement…"
              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-[13px] leading-relaxed text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{text.length}/6000</span>
              <div className="flex gap-2">
                {text && status !== 'loading' && <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Clear</Button>}
                <Button variant="ai" onClick={organise} disabled={!text.trim() || status === 'loading'} className="px-5">
                  <Wand2 className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
                  {status === 'loading' ? 'Organising…' : 'Organise with Claude'}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Try an example</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {EXAMPLES.map(({ label, icon: Icon, text: t }) => (
                <button key={label} onClick={() => { setText(t); setStatus('idle'); setEv(null); }}
                  className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm font-medium transition hover:border-indigo-200 hover:text-indigo-700 ${text === t ? 'border-indigo-300 text-indigo-700 ring-2 ring-indigo-100' : 'border-slate-200 text-slate-600'}`}>
                  <Icon className="h-4 w-4 shrink-0" /> {label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={addManually} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
            <Plus className="h-4 w-4" /> Or add an event manually
          </button>
        </div>

        {/* Output */}
        <div className="space-y-4">
          {status === 'idle' && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600"><Sparkles className="h-7 w-7" /></div>
              <p className="mt-4 font-semibold text-slate-900">Your structured event will appear here</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">Title, dates, venue, deadline, team size, prizes and tags, extracted in seconds.</p>
            </div>
          )}
          {status === 'loading' && <LoadingSteps />}
          {status === 'error' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 animate-fade-in">
              <div className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="h-5 w-5" /> Claude is temporarily unavailable.</div>
              <p className="mt-1 text-sm text-amber-800">{error?.message} You can still add the event manually.</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={organise}><RotateCcw className="h-4 w-4" /> Retry</Button>
                <Button onClick={addManually}><Plus className="h-4 w-4" /> Add manually</Button>
              </div>
            </div>
          )}
          {(status === 'done' || status === 'saved') && ev && (
            <>
              {editing ? <EditForm ev={ev} setEv={setEv} /> : <Preview ev={ev} meta={meta} />}
              {status === 'saved' ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 animate-scale-in">
                  <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Check className="h-5 w-5" /> Added to CampusOne. Now discoverable by every student.</span>
                  <Button variant="secondary" onClick={reset}>Organise another</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing((e) => !e)}>{editing ? <><Check className="h-4 w-4" /> Done editing</> : <><Pencil className="h-4 w-4" /> Edit</>}</Button>
                  <Button variant="ai" className="flex-1 py-3" onClick={save} disabled={saving}><Plus className="h-4 w-4" /> {saving ? 'Adding…' : 'Add to CampusOne'}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
