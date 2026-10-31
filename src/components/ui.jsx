import { useId } from 'react';
import { Sparkles, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { catMeta } from '../lib/categories.js';
import { deadlineInfo, URGENCY_STYLES } from '../lib/dates.js';
import { useApp } from '../lib/AppContext.jsx';

export function LogoMark({ size = 36, className = '' }) {
  // "C" ring (campus) around a bold "1" (one place); the amber dot marks "you are here".
  const uid = useId().replace(/:/g, '');
  const bg = `co-bg-${uid}`;
  const hl = `co-hl-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden className={`shrink-0 drop-shadow-[0_2px_6px_rgba(79,70,229,0.25)] ${className}`}>
      <defs>
        <linearGradient id={bg} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5B5BF0" />
          <stop offset="0.55" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
        <radialGradient id={hl} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 6) rotate(50) scale(30)">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${bg})`} />
      <rect width="40" height="40" rx="11" fill={`url(#${hl})`} />
      <path d="M27.8 12.2A11 11 0 1 0 27.8 27.8" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M17.4 16.8 21 14v12" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="31.4" cy="20" r="2.4" fill="#FCD34D" />
    </svg>
  );
}

export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={compact ? 30 : 32} />
      {!compact && (
        <div className="font-display text-[17px] font-semibold tracking-[-0.03em] text-slate-900">Campus<span className="text-indigo-600">One</span></div>
      )}
    </div>
  );
}

export function CategoryChip({ category, className = '' }) {
  const m = catMeta(category);
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${m.chip} ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {category}
    </span>
  );
}

export function DeadlineBadge({ date, className = '' }) {
  const info = deadlineInfo(date);
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${URGENCY_STYLES[info.level]} ${className}`}>
      {(info.level === 'critical' || info.level === 'urgent') && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" /></span>}
      {info.short}
    </span>
  );
}

export function Tag({ children }) {
  return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{children}</span>;
}

export function AIBadge({ children = 'Claude', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ${className}`}>
      <Sparkles className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

export function SectionHeader({ title, subtitle, icon: Icon, action, eyebrow }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">
          {Icon && <Icon className="h-5 w-5 text-slate-400" aria-hidden />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, badge, eyebrow, children }) {
  return (
    <header className="mb-8 animate-fade-in sm:mb-10">
      {badge && <div className="mb-4">{badge}</div>}
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900 sm:text-[44px]">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500 sm:text-base">{subtitle}</p>}
      {children}
    </header>
  );
}

export function CardSkeleton() {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between"><div className="skeleton h-5 w-20 rounded-full" /><div className="skeleton h-10 w-10" /></div>
      <div className="skeleton mt-5 h-5 w-4/5" />
      <div className="skeleton mt-2 h-4 w-2/5" />
      <div className="skeleton mt-5 h-3 w-full" />
      <div className="skeleton mt-2 h-3 w-5/6" />
      <div className="mt-6 flex justify-between border-t border-slate-100 pt-4"><div className="skeleton h-6 w-24 rounded-full" /><div className="skeleton h-8 w-20" /></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center animate-fade-in">
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e3e3de 1px, transparent 0)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 70%)' }} aria-hidden />
      {Icon && <div className="relative mb-5 grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm"><Icon className="h-5 w-5" aria-hidden /></div>}
      <h3 className="relative text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      {text && <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{text}</p>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-black disabled:bg-slate-300',
    ai: 'bg-slate-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_6px_18px_-8px_rgb(79_70_229/0.7)] hover:bg-black hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_10px_24px_-8px_rgb(79_70_229/0.8)] disabled:bg-slate-300 disabled:shadow-none',
    secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:active:scale-100 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  const icons = { success: CheckCircle2, info: Info, error: AlertTriangle };
  const colors = { success: 'text-emerald-400', info: 'text-indigo-300', error: 'text-red-400' };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottomnav-h)+16px)] z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.type] || Info;
        return (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl animate-slide-up">
            <Icon className={`h-5 w-5 shrink-0 ${colors[t.type]}`} aria-hidden />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

export function IconButton({ label, children, className = '', ...props }) {
  return (
    <button aria-label={label} className={`grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-500 ${className}`} {...props}>
      {children ?? <X className="h-5 w-5" />}
    </button>
  );
}

/** Circular match indicator. */
export function MatchRing({ value, size = 44, stroke = 4, className = '', muted = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={`${v}% match`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#efefeb" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={muted ? '#9d9d95' : '#4f46e5'} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-semibold tabular-nums text-slate-900" style={{ fontSize: size * 0.28 }}>{v}</span>
    </div>
  );
}
