import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Target, Code2, CalendarClock, Sparkles, ShieldCheck, LoaderCircle } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { Avatar, RequireAuth } from '../components/auth.jsx';
import { ChipSelect, SkillInput, FormSection, toggleIn, PROFILE_OPTIONS } from '../components/profile.jsx';
import { Button } from '../components/ui.jsx';

const ONBOARDING_GOALS = PROFILE_OPTIONS.GOALS.filter((g) => g !== 'Get scholarships');

function OnboardingForm() {
  const { user, saveProfile, toast } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    name: user.name || '',
    interests: user.interests || [],
    goals: user.goals || [],
    skills: user.skills || [],
    availability: user.availability || [],
  });
  const [saving, setSaving] = useState(false);
  const next = params.get('next');
  const dest = next && next.startsWith('/') && !next.startsWith('//') && next !== '/onboarding' ? next : '/';
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: toggleIn(d[k], v) }));
  const ready = draft.interests.length > 0 && draft.skills.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile({ ...draft, onboarded: true });
      toast(`Welcome to CampusOne, ${draft.name.split(' ')[0] || 'there'}!`);
      navigate(dest, { replace: true });
    } catch (err) {
      toast(err.message || 'Could not save your profile', 'error');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <header className="mb-6 animate-fade-in">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70"><Sparkles className="h-3.5 w-3.5" />Takes about 30 seconds</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Let's personalise CampusOne</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">Tell us what you're interested in so we can surface better opportunities and teammates.</p>
      </header>

      <div className="space-y-4">
        <section className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5">
          <Avatar name={draft.name || user.name} src={user.picture} size={56} />
          <div className="min-w-0 flex-1">
            <label htmlFor="ob-name" className="text-xs font-semibold text-slate-500">Name</label>
            <input id="ob-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
            {user.email && <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />{user.email} · private, never shown to other students</p>}
          </div>
        </section>

        <FormSection icon={Heart} title="Interests" hint="Pick everything that excites you.">
          <ChipSelect options={PROFILE_OPTIONS.INTERESTS} selected={draft.interests} onToggle={set('interests')} size="sm" />
        </FormSection>
        <FormSection icon={Code2} title="Skills" hint="Choose a few or type your own. Used to match you with teammates.">
          <SkillInput value={draft.skills} onChange={(skills) => setDraft({ ...draft, skills })} />
        </FormSection>
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <FormSection icon={Target} title="Goals">
            <ChipSelect options={ONBOARDING_GOALS} selected={draft.goals} onToggle={set('goals')} size="sm" />
          </FormSection>
          <FormSection icon={CalendarClock} title="Availability">
            <ChipSelect options={PROFILE_OPTIONS.AVAILABILITY} selected={draft.availability} onToggle={set('availability')} size="sm" />
          </FormSection>
        </div>

        <div className="sticky bottom-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur lg:bottom-4">
          <span className="text-sm text-slate-500">{ready ? 'Looking good. You can edit this anytime.' : 'Pick at least one interest and one skill.'}</span>
          <Button type="submit" variant="ai" disabled={!ready || saving}>{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Continue to CampusOne</Button>
        </div>
      </div>
    </form>
  );
}

export default function Onboarding() {
  const { user } = useApp();
  const [params] = useSearchParams();
  if (user?.onboarded && !params.get('edit')) return <Navigate to={params.get('next') || '/'} replace />;
  return <RequireAuth title="Join CampusOne"><OnboardingForm /></RequireAuth>;
}
