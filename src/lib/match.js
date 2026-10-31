// Client-side "why this matches you" explanations from real profile + event data.
// Claude provides the ranking/score for top picks; this explains the match in
// concrete, checkable terms and scores the rest of the catalogue locally.

const INTEREST_KEYWORDS = {
  'AI / ML': ['ai', 'machine learning', 'llm', 'llms', 'ml', 'generative', 'deep learning'],
  'Web Development': ['web development', 'web', 'react', 'javascript', 'frontend', 'full-stack', 'next.js'],
  'App Development': ['app development', 'flutter', 'mobile', 'android', 'ios'],
  'Data Science': ['data science', 'data', 'analytics', 'python', 'datathon'],
  Cybersecurity: ['cybersecurity', 'ctf', 'security'],
  Cloud: ['cloud', 'aws', 'devops', 'docker', 'kubernetes'],
  'UI/UX': ['ui/ux', 'design', 'figma', 'ux', 'ui'],
  Design: ['ui/ux', 'design', 'figma', 'creative'],
  Entrepreneurship: ['entrepreneurship', 'startup', 'startups', 'pitching', 'business'],
  'Competitive Programming': ['competitive programming', 'dsa', 'contest', 'icpc', 'coding'],
  'Open Source': ['open source', 'git', 'github'],
};

const GOAL_RULES = [
  { goal: 'Win hackathons', cats: ['Hackathon', 'Competition'], label: 'Hackathon goal' },
  { goal: 'Build projects', cats: ['Hackathon', 'Workshop'], label: 'Project-building goal' },
  { goal: 'Build a portfolio', cats: ['Hackathon', 'Competition', 'Workshop'], label: 'Portfolio goal' },
  { goal: 'Find internships', cats: ['Internship'], label: 'Internship goal' },
  { goal: 'Learn new skills', cats: ['Workshop', 'Seminar'], label: 'Learning goal' },
  { goal: 'Learn skills', cats: ['Workshop', 'Seminar'], label: 'Learning goal' },
  { goal: 'Join clubs', cats: ['Club'], label: 'Club goal' },
  { goal: 'Meet other students', cats: ['Club', 'Event'], label: 'Meet-students goal' },
  { goal: 'Meet students', cats: ['Club', 'Event'], label: 'Meet-students goal' },
  { goal: 'Get scholarships', cats: ['Scholarship'], label: 'Scholarship goal' },
];

const esc = (k) => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const hasWord = (text, k) => new RegExp(`(^|[^a-z0-9])${esc(k.toLowerCase())}([^a-z0-9]|$)`).test(text);
export const eventText = (e) => [e.title, e.category, e.description, ...(e.tags || [])].join(' ').toLowerCase();

export function interestMatches(event, interests = []) {
  const text = eventText(event);
  return interests.filter((i) => (INTEREST_KEYWORDS[i] || [i]).some((k) => hasWord(text, k)));
}

export function skillMatches(event, skills = []) {
  const text = eventText(event);
  return skills.filter((s) => s.length > 1 && hasWord(text, s.replace(/\.js$/i, '')));
}

function weekdayOf(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function availabilityMatch(event, availability = []) {
  if (!availability.length || !event.date) return null;
  if (availability.includes('Flexible')) return 'Flexible availability';
  const day = weekdayOf(event.date);
  const weekend = day === 0 || day === 6;
  if (weekend && availability.includes('Weekends')) return 'Weekend availability';
  if (!weekend && availability.includes('Weekdays')) return 'Weekday availability';
  if (/\b([5-9]|1[01])(:\d\d)?\s*pm\b/i.test(event.time || '') && availability.includes('Evenings')) return 'Evening availability';
  return null;
}

/**
 * Concrete reasons an event fits a student + a local 0-97 score.
 * `profile`: { interests, goals, skills, availability }.
 */
export function explainMatch(event, profile = {}) {
  const interests = interestMatches(event, profile.interests);
  const skills = skillMatches(event, profile.skills);
  const goal = GOAL_RULES.find((r) => (profile.goals || []).includes(r.goal) && r.cats.includes(event.category));
  const avail = availabilityMatch(event, profile.availability);
  const reasons = [
    ...interests.slice(0, 2).map((i) => `${i} interest`),
    ...(goal ? [goal.label] : []),
    ...skills.slice(0, 2).map((s) => `${s} skill`),
    ...(avail ? [avail] : []),
  ];
  const raw = interests.length * 14 + (goal ? 12 : 0) + Math.min(2, skills.length) * 8 + (avail ? 5 : 0);
  return { reasons, score: Math.min(97, raw ? 52 + raw : 40), interests, skills, goal: goal?.label || null };
}

/** Best available match for an event: Claude's ranking if present, otherwise local. */
export function matchFor(event, rec, profile) {
  const local = explainMatch(event, profile);
  return { score: rec?.score ?? local.score, reason: rec?.reason || null, reasons: local.reasons, source: rec ? 'claude' : 'local' };
}

export { INTEREST_KEYWORDS };
