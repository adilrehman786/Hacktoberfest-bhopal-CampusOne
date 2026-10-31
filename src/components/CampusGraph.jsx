// "Your campus network": YOU -> skills & interests -> opportunities -> teammates.
// Built from the signed-in profile and real listings. Nodes drift slightly
// (rAF writes SVG attributes directly, only while visible). Hover a node to
// highlight its connections and dim the rest.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { interestMatches, skillMatches } from '../lib/match.js';
import { daysUntil } from '../lib/dates.js';
import { usePrefersReducedMotion } from '../lib/motion.jsx';

const W = 1000, H = 600, CX = 500, CY = 290;
const EXAMPLE = { interests: ['AI / ML', 'Web Development'], skills: ['React', 'Python'] };

function buildGraph(events, profile) {
  const src = profile && (profile.interests.length || profile.skills.length) ? profile : EXAMPLE;
  const hubs = [
    ...src.interests.slice(0, 3).map((v) => ({ id: `i:${v}`, label: v, kind: 'interest' })),
    ...src.skills.slice(0, 3).map((v) => ({ id: `s:${v}`, label: v, kind: 'skill' })),
  ].slice(0, 5);
  const open = events.filter((e) => { const n = daysUntil(e.registrationDeadline); return e.category !== 'Announcement' && (n === null || n >= 0); });
  const opps = new Map();
  const edges = [];
  hubs.forEach((h) => {
    edges.push(['you', h.id]);
    const hits = open.filter((e) => (h.kind === 'interest' ? interestMatches(e, [h.label]) : skillMatches(e, [h.label])).length).slice(0, 3);
    hits.forEach((e) => {
      if (!opps.has(e.id) && opps.size < 9) opps.set(e.id, { id: `e:${e.id}`, eventId: e.id, label: e.title, kind: 'event', category: e.category });
      if (opps.has(e.id)) edges.push([h.id, `e:${e.id}`]);
    });
  });
  const teamable = [...opps.values()].filter((o) => o.category === 'Hackathon' || o.category === 'Competition');
  const team = teamable.length ? [{ id: 'team', label: 'Teammates', kind: 'team' }] : [];
  teamable.forEach((o) => edges.push([o.id, 'team']));

  // Radial layout: hubs on an inner ring, opportunities on an outer arc near their hub.
  const nodes = [{ id: 'you', label: 'You', kind: 'you', x: CX, y: CY }];
  hubs.forEach((h, i) => {
    const a = (-Math.PI / 2) + (i / hubs.length) * Math.PI * 2;
    nodes.push({ ...h, a, x: CX + Math.cos(a) * 165, y: CY + Math.sin(a) * 120 });
  });
  const oppList = [...opps.values()];
  oppList.forEach((o) => {
    const parents = edges.filter(([, b]) => b === o.id).map(([a]) => nodes.find((n) => n.id === a)).filter(Boolean);
    const a = parents.reduce((s, p) => s + p.a, 0) / Math.max(1, parents.length);
    o.a = a;
  });
  oppList.sort((p, q) => p.a - q.a).forEach((o, i, arr) => {
    const spread = (i - (arr.length - 1) / 2) * 0.02;
    const a = o.a + spread;
    const ring = i % 2 ? 300 : 340;
    nodes.push({ ...o, x: CX + Math.cos(a) * ring * 1.25, y: CY + Math.sin(a) * ring * 0.62 });
  });
  // De-overlap opportunities with a few relaxation passes.
  const ev = nodes.filter((n) => n.kind === 'event');
  for (let pass = 0; pass < 40; pass++) {
    for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length; j++) {
      const a = ev[i], b = ev[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 170 && Math.abs(dy) < 44) {
        const push = (44 - Math.abs(dy)) / 2 + 1;
        const s = dy >= 0 ? 1 : -1;
        a.y -= push * s; b.y += push * s;
      }
    }
  }
  // Labels sit outside the node (left side: text to the left), so keep room for ~26 chars.
  ev.forEach((n) => { n.x = n.x < CX ? Math.max(250, Math.min(CX - 70, n.x)) : Math.min(W - 250, Math.max(CX + 70, n.x)); n.y = Math.max(30, Math.min(H - 70, n.y)); });
  team.forEach((t) => nodes.push({ ...t, x: CX, y: H - 34 }));
  return { nodes, edges, example: src === EXAMPLE };
}

const STYLE = {
  you: { r: 30, fill: '#151514', text: '#fff' },
  interest: { r: 9, fill: '#4f46e5' },
  skill: { r: 9, fill: '#fff', stroke: '#4f46e5' },
  event: { r: 5, fill: '#151514' },
  team: { r: 7, fill: '#fff', stroke: '#151514' },
};

export default function CampusGraph() {
  const { events, profile, openEvent } = useApp();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const graph = useMemo(() => buildGraph(events, profile), [events, profile]);
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const edgeRefs = useRef([]);

  const related = useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    // walk one level both ways, plus the path back to "you"
    graph.edges.forEach(([a, b]) => { if (a === hover) set.add(b); if (b === hover) set.add(a); });
    graph.edges.forEach(([a, b]) => { if (set.has(b) && a === 'you') set.add(a); });
    return set;
  }, [hover, graph]);

  useEffect(() => {
    if (reduced) return undefined;
    const svg = svgRef.current;
    let raf = 0, visible = true;
    const pos = new Map(graph.nodes.map((n, i) => [n.id, { ...n, ph: i * 1.7, amp: n.kind === 'you' ? 2 : n.kind === 'event' ? 5 : 4 }]));
    const tick = (t) => {
      const cur = new Map();
      pos.forEach((n, id) => {
        const x = n.x + Math.sin(t / 2400 + n.ph) * n.amp;
        const y = n.y + Math.cos(t / 2900 + n.ph) * n.amp;
        cur.set(id, [x, y]);
        nodeRefs.current.get(id)?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      });
      graph.edges.forEach(([a, b], i) => {
        const el = edgeRefs.current[i]; const pa = cur.get(a), pb = cur.get(b);
        if (el && pa && pb) el.setAttribute('d', curve(pa, pb));
      });
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(tick); });
    io.observe(svg);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [graph, reduced]);

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const act = (n) => {
    if (n.kind === 'event') openEvent(n.eventId);
    else if (n.kind === 'team') navigate('/team');
    else if (n.kind === 'skill' || n.kind === 'interest') navigate(`/discover?q=${encodeURIComponent(n.kind === 'skill' ? n.label : n.label.split(/[\s/]+/)[0])}`);
    else if (n.kind === 'you') navigate('/profile');
  };

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="hidden h-auto w-full overflow-visible sm:block" role="img" aria-label="Your campus network: your interests and skills connected to matching opportunities">
        <g fill="none">
          {graph.edges.map(([a, b], i) => {
            const pa = byId.get(a), pb = byId.get(b);
            const on = related && related.has(a) && related.has(b);
            return (
              <path key={`${a}-${b}`} ref={(el) => { edgeRefs.current[i] = el; }} d={curve([pa.x, pa.y], [pb.x, pb.y])}
                stroke={on ? '#4f46e5' : '#151514'} strokeOpacity={related ? (on ? 0.7 : 0.05) : 0.12} strokeWidth={on ? 1.5 : 1}
                className="draw-line" style={{ '--len': 1400, animationDelay: `${150 + i * 25}ms`, transition: 'stroke-opacity .25s, stroke .25s' }} />
            );
          })}
        </g>
        {graph.nodes.map((n) => {
          const s = STYLE[n.kind];
          const dim = related && !related.has(n.id);
          const isHover = hover === n.id;
          const labelRight = n.x >= CX;
          return (
            <g key={n.id} ref={(el) => el && nodeRefs.current.set(n.id, el)} transform={`translate(${n.x} ${n.y})`}
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
              onClick={() => act(n)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && act(n)}
              tabIndex={0} role="button" aria-label={`${n.label}${n.kind === 'event' ? ` (${n.category})` : ''}`}
              className="cursor-pointer outline-none" style={{ opacity: dim ? 0.22 : 1, transition: 'opacity .25s' }}>
              <circle r={s.r * (isHover ? 1.35 : 1) + 12} fill="transparent" />
              {isHover && <circle r={s.r + 8} fill="#4f46e5" fillOpacity="0.1" />}
              <circle r={s.r * (isHover ? 1.35 : 1)} fill={s.fill} stroke={s.stroke} strokeWidth={s.stroke ? 2 : 0} style={{ transition: 'r .25s' }} />
              {n.kind === 'you' ? (
                <text textAnchor="middle" dy="5" fill="#fff" fontSize="14" fontWeight="600" fontFamily="Inter Tight, Inter, sans-serif">You</text>
              ) : n.kind === 'event' ? (
                <text x={labelRight ? 12 : -12} dy="4" textAnchor={labelRight ? 'start' : 'end'} fontSize="13" fill="#3c3c37" fontWeight={isHover ? 600 : 500} fontFamily="Inter, sans-serif">
                  {n.label.length > 26 ? `${n.label.slice(0, 24)}…` : n.label}
                </text>
              ) : (
                <text y={n.kind === 'team' ? 24 : -18} textAnchor="middle" fontSize={n.kind === 'team' ? 12 : 13} fill={n.kind === 'team' ? '#71716a' : '#151514'} fontWeight="600" fontFamily="Inter Tight, Inter, sans-serif" letterSpacing={n.kind === 'team' ? '0.08em' : '0'}>
                  {n.kind === 'team' ? 'TEAMMATES' : n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <MobileTree graph={graph} act={act} />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />Interest</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-indigo-600" />Skill</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-900" />Opportunity</span>
        {graph.example && <span className="ml-auto text-slate-400">Example network. Sign in and add skills to see yours.</span>}
      </div>
    </div>
  );
}

function curve([x1, y1], [x2, y2]) {
  const mx = (x1 + x2) / 2;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} C${mx.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Small screens: the same network as a readable tree. */
function MobileTree({ graph, act }) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const hubs = graph.nodes.filter((n) => n.kind === 'interest' || n.kind === 'skill');
  return (
    <div className="space-y-4 sm:hidden">
      <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">You</span><span className="h-px flex-1 bg-slate-200" /></div>
      {hubs.map((h) => {
        const kids = graph.edges.filter(([a]) => a === h.id).map(([, b]) => byId.get(b)).filter(Boolean);
        return (
          <div key={h.id} className="ml-4 border-l border-slate-200 pl-4">
            <button onClick={() => act(h)} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className={`h-2.5 w-2.5 rounded-full ${h.kind === 'interest' ? 'bg-indigo-600' : 'border-2 border-indigo-600'}`} />{h.label}
            </button>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kids.length ? kids.map((k) => (
                <button key={k.id} onClick={() => act(k)} className="max-w-full truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{k.label}</button>
              )) : <span className="text-xs text-slate-400">No open listings yet</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
