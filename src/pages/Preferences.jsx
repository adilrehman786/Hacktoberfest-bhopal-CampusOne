import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, User, Target, Heart } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { INTERESTS, GOALS } from '../lib/categories.js';
import { PageHeader, Button } from '../components/ui.jsx';

function Chips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 ${on ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:ring-indigo-300'}`}>
            {on && <Check className="h-4 w-4" />}{o}
          </button>
        );
      })}
    </div>
  );
}

export default function Preferences() {
  const { preferences, setPreferences, toast } = useApp();
  const [draft, setDraft] = useState(preferences);
  const navigate = useNavigate();
  const toggle = (key) => (v) => setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }));

  const save = (e) => {
    e.preventDefault();
    setPreferences(draft);
    toast('Preferences saved. Claude is re-ranking your recommendations.');
    navigate('/');
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl">
      <PageHeader title="Your preferences" subtitle="Tell CampusOne what you care about. Claude uses this to rank opportunities and explain why they matter to you." />

      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><User className="h-5 w-5 text-indigo-600" /> Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="text-xs font-semibold text-slate-500">Name</label>
              <input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
            </div>
            <div>
              <label htmlFor="year" className="text-xs font-semibold text-slate-500">Year</label>
              <select id="year" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100">
                {['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Heart className="h-5 w-5 text-indigo-600" /> Interests</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">Pick everything that excites you.</p>
          <Chips options={INTERESTS} selected={draft.interests} onToggle={toggle('interests')} />
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Target className="h-5 w-5 text-indigo-600" /> Goals</h2>
          <p className="mb-4 mt-0.5 text-sm text-slate-500">What do you want out of this semester?</p>
          <Chips options={GOALS} selected={draft.goals} onToggle={toggle('goals')} />
        </section>

        <div className="sticky bottom-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3 pl-5 shadow-lg backdrop-blur lg:bottom-4">
          <span className="flex items-center gap-2 text-sm text-slate-500"><Sparkles className="h-4 w-4 text-indigo-500" /> Saved to your CampusOne profile</span>
          <Button type="submit" variant="ai">Save & see recommendations</Button>
        </div>
      </div>
    </form>
  );
}
