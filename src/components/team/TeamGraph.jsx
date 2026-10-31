// Project -> required role -> student, with SVG connectors measured from the DOM.
// Lines draw in once, then follow layout changes (ResizeObserver). Hovering a
// student or role highlights its path back to the project.
import { useLayoutEffect, useRef, useState } from 'react';
import { Brain, Atom, Palette, Server, Layers, Smartphone, BarChart3, Cloud, Shield, Lightbulb, Puzzle } from 'lucide-react';
import { Avatar } from '../auth.jsx';

const ROLE_ICONS = { ml: Brain, frontend: Atom, backend: Server, fullstack: Layers, design: Palette, mobile: Smartphone, data: BarChart3, cloud: Cloud, security: Shield, product: Lightbulb, other: Puzzle };

export default function TeamGraph({ analysis, matches, selected, user, onView }) {
  const wrapRef = useRef(null);
  const refs = useRef(new Map());
  const [paths, setPaths] = useState([]);
  const [hover, setHover] = useState(null);

  // Who fills each role: you (covered), else selected students assigned to that role, else best match.
  const selectedMatches = matches.filter((m) => selected.includes(m.studentId));
  const rows = analysis.roles.map((r) => {
    if (r.coveredByRequester) return { role: r, people: [{ key: 'you', you: true }] };
    const people = selectedMatches.filter((m) => m.role === r.role);
    const fallback = people.length ? [] : matches.filter((m) => m.role === r.role).slice(0, 1).map((m) => ({ ...m, ghost: true }));
    return { role: r, people: [...people, ...fallback].map((m) => ({ key: m.studentId, m, ghost: m.ghost })) };
  });

  const setRef = (key) => (el) => { if (el) refs.current.set(key, el); else refs.current.delete(key); };

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const box = wrap.getBoundingClientRect();
      const pt = (key, side) => {
        const el = refs.current.get(key);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [side === 'right' ? r.right - box.left : r.left - box.left, r.top - box.top + r.height / 2];
      };
      const out = [];
      rows.forEach((row) => {
        const a = pt('project', 'right'), b = pt(`role:${row.role.role}`, 'left');
        if (a && b) out.push({ id: `p-${row.role.role}`, role: row.role.role, d: curve(a, b), covered: row.role.coveredByRequester });
        row.people.forEach((p) => {
          const c = pt(`role:${row.role.role}`, 'right'), e = pt(`person:${row.role.role}:${p.key}`, 'left');
          if (c && e) out.push({ id: `r-${row.role.role}-${p.key}`, role: row.role.role, person: p.key, ghost: p.ghost, d: curve(c, e) });
        });
      });
      setPaths(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, selected.join(','), matches]);

  const lit = (p) => hover && (hover.role === p.role && (!hover.person || !p.person || hover.person === p.person));

  return (
    <div ref={wrapRef} className="relative">
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" aria-hidden>
        {paths.map((p, i) => (
          <path key={p.id} d={p.d} fill="none" stroke={lit(p) ? '#4f46e5' : p.covered ? '#10b981' : '#151514'}
            strokeOpacity={hover ? (lit(p) ? 0.9 : 0.08) : p.ghost ? 0.15 : 0.28} strokeWidth={lit(p) ? 2 : 1.25} strokeDasharray={p.ghost ? '4 5' : undefined}
            className={p.ghost ? '' : 'draw-line'} style={{ '--len': 900, animationDelay: `${i * 70}ms`, transition: 'stroke-opacity .25s, stroke .25s' }} />
        ))}
      </svg>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        {/* Project */}
        <div className="flex items-center">
          <div ref={setRef('project')} className="w-full rounded-2xl bg-slate-900 p-5 text-white shadow-xl animate-scale-in">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Project</p>
            <h3 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight">{analysis.projectName}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-300">{analysis.projectSummary}</p>
            <div className="mt-3 flex flex-wrap gap-1">{(analysis.projectTags || []).slice(0, 4).map((t) => <span key={t} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-200">{t}</span>)}</div>
          </div>
        </div>

        {/* Roles */}
        <div className="flex flex-col justify-center gap-3">
          <p className="eyebrow lg:hidden">Recommended team</p>
          {rows.map(({ role }, i) => {
            const Icon = ROLE_ICONS[role.icon] || Puzzle;
            const on = hover?.role === role.role;
            return (
              <div key={role.role} ref={setRef(`role:${role.role}`)} onMouseEnter={() => setHover({ role: role.role })} onMouseLeave={() => setHover(null)}
                style={{ animationDelay: `${150 + i * 80}ms` }}
                className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 transition-all duration-200 animate-slide-up ${on ? 'border-indigo-300 shadow-md' : 'border-slate-200/80 shadow-sm'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${role.coveredByRequester ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{role.role}</div>
                  <div className="truncate text-xs text-slate-500">{role.skills.slice(0, 3).join(' · ')}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* People */}
        <div className="flex flex-col justify-center gap-3">
          {rows.map(({ role, people }) => (
            <div key={role.role} className="space-y-2">
              <p className="text-[11px] font-medium text-slate-400 lg:hidden">{role.role}</p>
              {people.map((p, i) => (
                <div key={p.key} ref={setRef(`person:${role.role}:${p.key}`)}
                  onMouseEnter={() => setHover({ role: role.role, person: p.key })} onMouseLeave={() => setHover(null)}
                  style={{ animationDelay: `${350 + i * 80}ms` }}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 animate-slide-up ${p.ghost ? 'border-dashed border-slate-300 bg-white/60' : 'border-slate-200/80 bg-white shadow-sm'} ${hover?.person === p.key ? 'border-indigo-300 shadow-md' : ''}`}>
                  {p.you ? (
                    <>
                      <Avatar name={user.name} src={user.picture} size={32} className="!ring-0" />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-900">You</div><div className="truncate text-xs text-emerald-600">Covering this role</div></div>
                    </>
                  ) : (
                    <>
                      <Avatar name={p.m.student.name} src={p.m.student.picture} size={32} className="!ring-0" />
                      <button onClick={() => onView?.(p.m)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm font-semibold text-slate-900">{p.m.student.name}</div>
                        <div className="truncate text-xs text-slate-500">{p.ghost ? 'Best available, not in team yet' : p.m.matchedSkills.join(' · ') || p.m.student.skills.slice(0, 3).join(' · ')}</div>
                      </button>
                      <span className={`font-display text-sm font-semibold tabular-nums ${p.ghost ? 'text-slate-400' : 'text-indigo-600'}`}>{p.m.score}%</span>
                    </>
                  )}
                </div>
              ))}
              {!people.length && <div ref={setRef(`person:${role.role}:none`)} className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-400">No match yet for this role</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function curve([x1, y1], [x2, y2]) {
  const mx = x1 + (x2 - x1) / 2;
  return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
}
