// Non-AI fallbacks so CampusOne keeps working when Claude is unavailable.

const INTEREST_KEYWORDS = {
  'AI / ML': ['ai', 'machine learning', 'llms', 'llm', 'ml', 'generative', 'research'],
  'Web Development': ['web development', 'react', 'javascript', 'frontend', 'web3', 'open source', 'git'],
  'App Development': ['app development', 'flutter', 'mobile', 'android', 'ios'],
  Cybersecurity: ['cybersecurity', 'ctf', 'security'],
  'Data Science': ['data science', 'python', 'analytics', 'data'],
  Entrepreneurship: ['entrepreneurship', 'startups', 'pitching', 'startup'],
  Design: ['design', 'ui/ux', 'figma', 'creative', 'photography'],
  'UI/UX': ['design', 'ui/ux', 'figma', 'creative', 'ux', 'ui'],
  Cloud: ['cloud', 'aws', 'devops', 'docker', 'kubernetes'],
  'Open Source': ['open source', 'git', 'github'],
  'Competitive Programming': ['competitive programming', 'dsa', 'contest', 'icpc'],
};

const GOAL_CATEGORIES = {
  'Build projects': ['Hackathon', 'Workshop'],
  'Find internships': ['Internship'],
  'Win hackathons': ['Hackathon', 'Competition'],
  'Learn skills': ['Workshop', 'Seminar'],
  'Learn new skills': ['Workshop', 'Seminar'],
  'Meet other students': ['Club', 'Event'],
  'Build a portfolio': ['Hackathon', 'Workshop', 'Competition'],
  'Meet students': ['Club', 'Event'],
  'Join clubs': ['Club'],
  'Get scholarships': ['Scholarship'],
};

const esc = (k) => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const hasWord = (text, k) => new RegExp(`(^|[^a-z0-9])${esc(k)}([^a-z0-9]|$)`).test(text);

const today = () => new Date().toISOString().slice(0, 10);

function haystack(e) {
  return [e.title, e.category, e.description, ...(e.tags || [])].join(' ').toLowerCase();
}

export function localRecommend({ preferences = {}, events }) {
  const interests = preferences.interests || [];
  const goals = preferences.goals || [];
  const t = today();
  return events
    .filter((e) => e.category !== 'Announcement' && (!e.registrationDeadline || e.registrationDeadline >= t))
    .map((e) => {
      const text = haystack(e);
      const matchedInterests = interests.filter((i) => (INTEREST_KEYWORDS[i] || [i.toLowerCase()]).some((k) => hasWord(text, k)));
      const matchedGoals = goals.filter((g) => (GOAL_CATEGORIES[g] || []).includes(e.category));
      const raw = matchedInterests.length * 2 + matchedGoals.length;
      const score = Math.min(97, 55 + raw * 9);
      const bits = [];
      if (matchedInterests.length) bits.push(`your interest in ${matchedInterests.slice(0, 2).join(' & ')}`);
      if (matchedGoals.length) bits.push(`your goal to ${matchedGoals[0].toLowerCase()}`);
      return {
        id: e.id,
        score,
        raw,
        reason: bits.length ? `Matches ${bits.join(' and ')}.` : 'Popular on campus right now.',
      };
    })
    .sort((a, b) => b.raw - a.raw || b.score - a.score)
    .slice(0, 6)
    .map(({ raw, ...r }) => r);
}

export function localSummary({ events }) {
  const t = today();
  const sorted = [...events].sort((a, b) => (a.registrationDeadline || '9999').localeCompare(b.registrationDeadline || '9999'));
  return {
    headline: `You missed ${events.length} campus updates this week. Here's what matters:`,
    highlights: sorted
      .filter((e) => !e.registrationDeadline || e.registrationDeadline >= t)
      .slice(0, 4)
      .map((e) => ({ id: e.id, text: `${e.organizer} posted "${e.title}"${e.registrationDeadline ? `, register by ${e.registrationDeadline}` : ''}.` })),
  };
}

/** Non-AI weekly briefing fallback. */
export function localBriefing({ events, preferences = {} }) {
  const t = today();
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const used = new Set();
  const take = (list, kind, reason, n) => list.filter((e) => !used.has(e.id)).slice(0, n).map((e) => { used.add(e.id); return { eventId: e.id, kind, reason: reason(e) }; });
  const recs = localRecommend({ preferences, events });
  const byId = new Map(events.map((e) => [e.id, e]));
  const matches = take(recs.map((r) => byId.get(r.id)).filter(Boolean), 'match', (e) => recs.find((r) => r.id === e.id)?.reason || 'Popular on campus right now.', 3);
  const deadlines = take(events.filter((e) => e.registrationDeadline && e.registrationDeadline >= t && e.registrationDeadline <= in7 && e.category !== 'Announcement')
    .sort((a, b) => a.registrationDeadline.localeCompare(b.registrationDeadline)), 'deadline', (e) => `Registration closes ${e.registrationDeadline}.`, 3);
  const portfolio = take(events.filter((e) => ['Hackathon', 'Competition', 'Workshop'].includes(e.category) && e.date && e.date >= t && e.date <= in14 && (!e.registrationDeadline || e.registrationDeadline >= t)), 'portfolio', (e) => `A ${e.category.toLowerCase()} you can turn into a portfolio piece.`, 2);
  const items = [...matches, ...deadlines, ...portfolio];
  return { headline: `${items.length} things worth your attention on campus this week.`, items };
}
