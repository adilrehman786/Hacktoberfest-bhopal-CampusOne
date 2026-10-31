const DAY = 864e5;

function parse(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function daysUntil(iso) {
  const d = parse(iso);
  if (!d) return null;
  return Math.round((d - startOfToday()) / DAY);
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short' }) {
  const d = parse(iso);
  return d ? d.toLocaleDateString('en-US', opts) : 'Date TBA';
}

export function formatLong(iso) {
  return formatDate(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function dateParts(iso) {
  const d = parse(iso);
  if (!d) return { month: 'TBA', day: '-', weekday: '' };
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

// Human deadline copy + urgency level.
export function deadlineInfo(iso) {
  const n = daysUntil(iso);
  if (n === null) return null;
  if (n < 0) return { n, level: 'closed', text: 'Registration closed', short: 'Closed' };
  if (n === 0) return { n, level: 'critical', text: 'Registration closes today', short: 'Closes today' };
  if (n === 1) return { n, level: 'critical', text: 'Registration closes tomorrow', short: 'Closes tomorrow' };
  if (n <= 3) return { n, level: 'urgent', text: `Registration closes in ${n} days`, short: `${n} days left` };
  if (n <= 7) return { n, level: 'soon', text: `Registration closes in ${n} days`, short: `${n} days left` };
  return { n, level: 'later', text: `Register by ${formatDate(iso)}`, short: `By ${formatDate(iso)}` };
}

export const URGENCY_STYLES = {
  critical: 'bg-red-50 text-red-700 ring-red-200',
  urgent: 'bg-orange-50 text-orange-700 ring-orange-200',
  soon: 'bg-amber-50 text-amber-700 ring-amber-200',
  later: 'bg-slate-100 text-slate-600 ring-slate-200',
  closed: 'bg-slate-100 text-slate-400 ring-slate-200',
};

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
