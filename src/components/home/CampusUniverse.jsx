// "Campus opportunity universe": a lightweight pseudo-3D constellation on a 2D canvas.
// Every bright node is a real CampusOne listing (hover shows it, click opens it);
// faint nodes are students. Clusters group listings by type.
// Perf: ~50 nodes, one canvas, rAF only while visible + tab active, DPR capped at 2,
// static frame for prefers-reduced-motion.
import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../lib/motion.jsx';
import { daysUntil } from '../../lib/dates.js';

const CLUSTERS = {
  Hackathon: { dir: [0.9, 0.25, 0.3], label: 'Hackathons' },
  Competition: { dir: [0.75, -0.45, 0.45], label: null },
  Workshop: { dir: [-0.85, 0.35, 0.35], label: 'Workshops' },
  Seminar: { dir: [-0.6, 0.75, -0.2], label: null },
  Club: { dir: [-0.35, -0.8, 0.45], label: 'Clubs' },
  Event: { dir: [0.05, -0.55, -0.85], label: 'Events' },
  Internship: { dir: [0.35, 0.85, -0.35], label: 'Internships' },
  Scholarship: { dir: [0.6, 0.55, -0.6], label: null },
  Announcement: { dir: [-0.75, -0.15, -0.65], label: null },
};

// Deterministic PRNG so the layout is stable between renders.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const norm = ([x, y, z]) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

function buildScene(events) {
  const r = rng(7);
  const nodes = events.slice(0, 40).map((e) => {
    const c = CLUSTERS[e.category] || CLUSTERS.Event;
    const d = norm([c.dir[0] + (r() - 0.5) * 0.7, c.dir[1] + (r() - 0.5) * 0.7, c.dir[2] + (r() - 0.5) * 0.7]);
    const rad = 0.55 + r() * 0.4;
    const n = daysUntil(e.registrationDeadline);
    return { id: e.id, title: e.title, category: e.category, urgent: n !== null && n >= 0 && n <= 2, hot: e.category === 'Hackathon' || e.category === 'Competition', p: [d[0] * rad, d[1] * rad, d[2] * rad], size: 2.6 + r() * 1.4 };
  });
  for (let i = 0; i < 16; i++) {
    const d = norm([r() - 0.5, r() - 0.5, r() - 0.5]);
    const rad = 0.3 + r() * 0.75;
    nodes.push({ id: null, student: true, p: [d[0] * rad, d[1] * rad, d[2] * rad], size: 1.4 + r() });
  }
  // Edges: each node to its 2 nearest neighbours (deduped).
  const edges = new Set();
  nodes.forEach((a, i) => {
    nodes.map((b, j) => ({ j, d: i === j ? Infinity : Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]) }))
      .sort((x, y) => x.d - y.d).slice(0, 2)
      .forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const labels = Object.entries(CLUSTERS).filter(([, c]) => c.label).map(([k, c]) => ({ text: c.label, p: norm(c.dir).map((v) => v * 0.98), cat: k }));
  return { nodes, edges: [...edges].map((k) => k.split('-').map(Number)), labels };
}

export default function CampusUniverse({ events, onSelect, className = '' }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const [hover, setHover] = useState(null);
  const reduced = usePrefersReducedMotion();
  const state = useRef({ angle: 0.6, tiltX: 0, tiltY: 0, targetX: 0, targetY: 0, pointer: null, projected: [], hoverIdx: -1, visible: true });
  const sceneRef = useRef(null);

  useEffect(() => { sceneRef.current = buildScene(events); }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();
    const st = state.current;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const project = ([x, y, z]) => {
      const ca = Math.cos(st.angle), sa = Math.sin(st.angle);
      let X = x * ca - z * sa, Z = x * sa + z * ca, Y = y;
      const cx = Math.cos(st.tiltX), sx = Math.sin(st.tiltX);
      const Y2 = Y * cx - Z * sx; Z = Y * sx + Z * cx; Y = Y2;
      const cy = Math.cos(st.tiltY), sy = Math.sin(st.tiltY);
      const X2 = X * cy + Z * sy; Z = -X * sy + Z * cy; X = X2;
      const f = 2.6 / (2.6 + Z);
      const scale = Math.min(w, h) * 0.4;
      return { x: w / 2 + X * scale * f, y: h / 2 + Y * scale * f, z: Z, f };
    };

    function draw() {
      const scene = sceneRef.current;
      if (!scene || !w) return;
      ctx.clearRect(0, 0, w, h);
      const pts = scene.nodes.map((n) => project(n.p));
      st.projected = pts;
      const hi = st.hoverIdx;
      const linked = new Set();
      if (hi >= 0) scene.edges.forEach(([a, b]) => { if (a === hi) linked.add(b); if (b === hi) linked.add(a); });

      // edges
      ctx.lineWidth = 1;
      for (const [a, b] of scene.edges) {
        const pa = pts[a], pb = pts[b];
        const depth = (pa.f + pb.f) / 2;
        const active = hi >= 0 && (a === hi || b === hi);
        ctx.strokeStyle = active ? 'rgba(79,70,229,0.55)' : `rgba(21,21,20,${0.05 + (depth - 0.7) * 0.22})`;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
      // labels (behind nodes)
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const l of scene.labels) {
        const p = project(l.p);
        ctx.fillStyle = `rgba(113,113,106,${Math.max(0, (p.f - 0.62) * 1.6)})`;
        ctx.fillText(l.text.toUpperCase(), p.x, p.y);
      }
      // nodes, far to near
      const order = pts.map((p, i) => i).sort((i, j) => pts[i].z - pts[j].z);
      for (const i of order) {
        const n = scene.nodes[i], p = pts[i];
        const dim = hi >= 0 && i !== hi && !linked.has(i);
        const r = n.size * p.f * (i === hi ? 1.9 : 1);
        let fill;
        if (n.student) fill = `rgba(157,157,149,${dim ? 0.25 : 0.55})`;
        else if (n.urgent) fill = dim ? 'rgba(220,38,38,0.3)' : '#dc2626';
        else if (n.hot) fill = dim ? 'rgba(79,70,229,0.3)' : '#4f46e5';
        else fill = dim ? 'rgba(21,21,20,0.25)' : `rgba(21,21,20,${0.55 + (p.f - 0.7) * 0.8})`;
        if (i === hi || (!n.student && n.urgent)) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = n.urgent ? 'rgba(220,38,38,0.12)' : 'rgba(79,70,229,0.14)'; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
      }
      // keep tooltip glued to hovered node
      if (hi >= 0 && tipRef.current) {
        const p = pts[hi];
        tipRef.current.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
      }
    }

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.angle += dt * 0.045;
      st.tiltX += (st.targetX - st.tiltX) * 0.06;
      st.tiltY += (st.targetY - st.tiltY) * 0.06;
      draw();
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && !reduced && st.visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const pick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      st.targetY = ((x / rect.width) - 0.5) * 0.5;
      st.targetX = ((y / rect.height) - 0.5) * -0.35;
      let best = -1, bd = 18;
      st.projected.forEach((p, i) => {
        const n = sceneRef.current?.nodes[i];
        if (!n || n.student) return;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bd) { bd = d; best = i; }
      });
      if (best !== st.hoverIdx) {
        st.hoverIdx = best;
        const n = best >= 0 ? sceneRef.current.nodes[best] : null;
        setHover(n ? { id: n.id, title: n.title, category: n.category, urgent: n.urgent } : null);
        canvas.style.cursor = n ? 'pointer' : 'default';
        if (reduced) draw();
      }
    };
    const leave = () => { st.targetX = 0; st.targetY = 0; if (st.hoverIdx !== -1) { st.hoverIdx = -1; setHover(null); if (reduced) draw(); } };
    const click = () => { const n = sceneRef.current?.nodes[st.hoverIdx]; if (n?.id) onSelect?.(n.id); };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver(([en]) => { st.visible = en.isIntersecting; if (st.visible) start(); else stop(); });
    io.observe(wrap);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', vis);
    canvas.addEventListener('pointermove', pick);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('click', click);
    resize();
    start();
    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('pointermove', pick);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('click', click);
    };
  }, [reduced, onSelect, events]);

  return (
    <div ref={wrapRef} className={`relative ${className}`} style={{ maskImage: 'radial-gradient(ellipse at center, black 55%, transparent 78%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 55%, transparent 78%)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 touch-pan-y" aria-label="Map of campus opportunities. Each dot is a listing." role="img" />
      <div ref={tipRef} className="pointer-events-none absolute left-0 top-0" aria-live="polite">
        {hover && (
          <div className="-translate-x-1/2 translate-y-4 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-in">
            <span className="text-slate-400">{hover.category} · </span>{hover.title.length > 34 ? `${hover.title.slice(0, 32)}…` : hover.title}
            {hover.urgent && <span className="ml-1.5 text-red-300">closing</span>}
          </div>
        )}
      </div>
    </div>
  );
}
