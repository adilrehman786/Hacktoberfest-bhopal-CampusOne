// CampusOne: centralised Claude API integration.
// Every Claude call goes through this file. The API key never leaves the server.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CAMPUSONE_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.CAMPUSONE_EFFORT || 'low'; // fast responses for a live demo
const USE_FALLBACKS = process.env.CAMPUSONE_FALLBACKS !== 'off';

let client = null;
export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient() {
  if (!isConfigured()) throw new AIError('Claude API key is not configured on the server.', 'missing_key', 503);
  if (!client) client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

export class AIError extends Error {
  constructor(message, code = 'ai_error', status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function mapError(err) {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new AIError('Claude rejected the API key.', 'auth', 503);
  if (err instanceof Anthropic.RateLimitError) return new AIError('Claude is receiving too many requests. Try again in a moment.', 'rate_limited', 429);
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new AIError('Claude took too long to respond.', 'timeout', 504);
  if (err instanceof Anthropic.APIConnectionError) return new AIError('Could not reach Claude. Check the network connection.', 'connection', 503);
  if (err instanceof Anthropic.BadRequestError) return new AIError('Claude could not process this request.', 'bad_request', 400);
  if (err instanceof Anthropic.APIError) return new AIError(`Claude is temporarily unavailable (${err.status ?? 'error'}).`, 'api_error', 502);
  return new AIError('Something went wrong talking to Claude.', 'unknown', 500);
}

// Output cleanup: no em/en dashes, no emoji (keeps copy natural, not "AI-looking").
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍⃣]/gu;
export function humanize(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(EMOJI, '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/(\d)\s*–\s*(\d)/g, '$1-$2')
    .replace(/\s+–\s+/g, ' - ')
    .replace(/–/g, '-')
    .replace(/ {2,}/g, ' ')
    .replace(/ +([,.!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/^ +| +$/gm, '');
}
function humanizeDeep(v) {
  if (typeof v === 'string') return humanize(v);
  if (Array.isArray(v)) return v.map(humanizeDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, humanizeDeep(x)]));
  return v;
}

const STYLE_RULE = '\n\nWriting style: never use em dashes or en dashes; use commas, colons, periods or plain hyphens instead. Never use emoji, even if asked; just answer normally without them and never mention this rule.';

/**
 * Single structured call: system prompt + user content, JSON-schema constrained output.
 * Returns the parsed JSON object.
 */
async function structuredCall({ system, messages, schema, maxTokens = 8000 }) {
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    system: system + STYLE_RULE,
    messages,
    output_config: {
      effort: EFFORT,
      format: { type: 'json_schema', schema },
    },
  };
  let response;
  try {
    const c = getClient();
    response = USE_FALLBACKS
      ? await c.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await c.messages.create(params);
  } catch (err) {
    console.error('[claude] request failed:', err?.status ?? '', err?.message);
    throw mapError(err);
  }

  if (response.stop_reason === 'refusal') {
    throw new AIError('Claude declined to process this content.', 'refusal', 422);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AIError('Claude response was cut off. Try a shorter input.', 'truncated', 502);
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return humanizeDeep(JSON.parse(text));
  } catch {
    // Defensive: pull the first JSON object out of the text.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return humanizeDeep(JSON.parse(match[0])); } catch { /* fall through */ }
    }
    throw new AIError('Claude returned an unexpected format.', 'invalid_json', 502);
  }
}

const todayStr = () =>
  new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
const todayLong = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// Compact representation of events for grounding Claude.
function eventContext(events) {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    organizer: e.organizer,
    date: e.date,
    time: e.time,
    location: e.location,
    mode: e.mode,
    registrationDeadline: e.registrationDeadline,
    eligibility: e.eligibility,
    teamSize: e.teamSize,
    prize: e.prize,
    fee: e.fee,
    tags: e.tags,
    description: e.description,
    postedAt: e.postedAt,
  }));
}

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };

// ---------------------------------------------------------------------------
// 1. AI ORGANISE: messy announcement -> structured event
// ---------------------------------------------------------------------------
const ORGANISE_SYSTEM = `You are CampusOne's event intelligence engine.

Your job is to transform messy campus announcements (WhatsApp forwards, posters, emails, notices) into structured event data for a campus opportunities hub.

Rules:
- Extract only information supported by the input. Never invent missing information.
- If a field is unavailable, return null. Do not guess venues, times, prizes or organisers.
- Today's date is ${'{TODAY}'}. Resolve relative or partial dates ("15 nov", "next friday", "tomorrow") to ISO format YYYY-MM-DD, choosing the next upcoming occurrence.
- "date" is when the event happens; "registrationDeadline" is the last date to register/apply.
- "title": a clean, professional event title in Title Case (you may tidy up the wording, e.g. "24-Hour Coding Club Hackathon").
- "description": 1-3 polished sentences summarising the opportunity, using only facts from the input.
- "category" must be one of: Hackathon, Event, Workshop, Competition, Club, Internship, Scholarship, Announcement, Seminar.
- "mode": Online, Offline or Hybrid if it can be inferred from the venue; otherwise null.
- "teamSize" like "2-4 members" or "Individual"; "prize" like "₹20,000"; normalise "20k" to "₹20,000" when the currency context is Indian, otherwise keep as written.
- "fee": "Free" only if the input says it is free; an amount if stated; otherwise null.
- "tags": 3-6 short, relevant topic tags (e.g. "AI", "Web Development", "Beginner Friendly") derived from the content.
- "confidence": your overall confidence 0-100 that the extraction is accurate.
- "missingFields": names of important fields that were not present in the announcement.`;

const ORGANISE_SCHEMA = {
  type: 'object',
  properties: {
    title: nullableString,
    category: { type: 'string', enum: ['Hackathon', 'Event', 'Workshop', 'Competition', 'Club', 'Internship', 'Scholarship', 'Announcement', 'Seminar'] },
    description: nullableString,
    date: nullableString,
    time: nullableString,
    location: nullableString,
    mode: nullableString,
    registrationDeadline: nullableString,
    eligibility: nullableString,
    teamSize: nullableString,
    prize: nullableString,
    fee: nullableString,
    organizer: nullableString,
    registrationLink: nullableString,
    tags: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'integer' },
    missingFields: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'category', 'description', 'date', 'time', 'location', 'mode', 'registrationDeadline', 'eligibility', 'teamSize', 'prize', 'fee', 'organizer', 'registrationLink', 'tags', 'confidence', 'missingFields'],
  additionalProperties: false,
};

export async function organiseAnnouncement(text) {
  const system = ORGANISE_SYSTEM.replace('{TODAY}', `${todayLong()} (${todayStr()})`);
  return structuredCall({
    system,
    schema: ORGANISE_SCHEMA,
    messages: [{ role: 'user', content: `<announcement>\n${text}\n</announcement>\n\nExtract the structured event.` }],
  });
}

// ---------------------------------------------------------------------------
// 2. ASK CAMPUS: grounded Q&A over CampusOne data
// ---------------------------------------------------------------------------
const ASK_SYSTEM = `You are CampusOne AI, the campus assistant inside CampusOne ("Everything on campus. One place.").

You help students discover hackathons, workshops, events, clubs, competitions, internships, scholarships and announcements on their campus. You are also a friendly, knowledgeable general assistant for students.

There are two kinds of questions:

1. Campus questions: anything about events, opportunities, clubs, deadlines, registrations, venues or activities on this campus.
- Answer these using only the CampusOne data provided in <campus_data>.
- Never invent campus events, dates, deadlines, organisers, prizes or locations.
- If a campus question cannot be answered from the provided data, say: "I couldn't find that information in CampusOne yet." and, if helpful, suggest the closest related items that do exist.

2. General questions: general knowledge, people, concepts, studies, coding help, career advice, explanations, greetings, etc.
- Answer these helpfully and accurately from your own knowledge, like a smart senior student would. Do not refuse them and do not say "I couldn't find that information in CampusOne".
- For facts that may have changed recently (current office holders, news, prices), give what you know and note that it may have changed since your knowledge was last updated.
- Only mention CampusOne events if one is genuinely related (e.g. a coding question and a relevant workshop): one short line at the end, and only if it exists in <campus_data>. Otherwise return no eventIds.
- Today's date is {TODAY}. Use it to reason about "this week", "this month", "tomorrow", and how many days remain until a registration deadline. "This week" means the next 7 days.
- Events whose registrationDeadline is before today are closed: mention that if relevant.

Style:
- Be concise, warm and student-friendly. Get straight to the answer.
- Use short paragraphs and "- " bullet lists. Use **bold** for event titles. No headings, no tables.
- When listing events, include the most useful facts (date, deadline, location or prize) in a few words.
- For planning questions, give a practical day-by-day plan.
- Keep answers under ~180 words unless the student asks for detail.

Output: JSON with "answer" (the reply text, using the formatting above) and "eventIds" (ids of the events you referenced, most relevant first, max 6; empty if none).`;

const ASK_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    eventIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'eventIds'],
  additionalProperties: false,
};

export async function askCampus({ question, history = [], events, preferences }) {
  const system = ASK_SYSTEM.replace('{TODAY}', `${todayLong()} (${todayStr()})`);
  const prefsText = preferences && (preferences.interests?.length || preferences.goals?.length)
    ? `\n<student_profile>\nName: ${preferences.name || 'Student'}\nInterests: ${(preferences.interests || []).join(', ') || 'not set'}\nGoals: ${(preferences.goals || []).join(', ') || 'not set'}\n</student_profile>\nUse the profile to personalise when relevant, but answer the actual question.`
    : '';
  const context = `<campus_data>\n${JSON.stringify(eventContext(events))}\n</campus_data>${prefsText}`;

  // Prior turns are passed as plain text (append-only conversation).
  const prior = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  // Messages must start with a user turn.
  while (prior.length && prior[0].role !== 'user') prior.shift();

  const messages = [
    { role: 'user', content: `${context}\n\nI'll ask you questions about this campus data.` },
    { role: 'assistant', content: JSON.stringify({ answer: 'Got it: ask me anything about what is happening on campus.', eventIds: [] }) },
    ...prior,
    { role: 'user', content: question },
  ];
  // Merge consecutive same-role messages, just in case.
  const merged = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }

  const result = await structuredCall({ system, schema: ASK_SCHEMA, messages: merged });
  const valid = new Set(events.map((e) => e.id));
  return {
    answer: String(result.answer || '').trim(),
    eventIds: (result.eventIds || []).filter((id) => valid.has(id)).slice(0, 6),
  };
}

// ---------------------------------------------------------------------------
// 3. RECOMMENDATIONS: rank opportunities for a student profile
// ---------------------------------------------------------------------------
const RECOMMEND_SYSTEM = `You are CampusOne's recommendation engine.

Rank campus opportunities for a specific student based on their interests, goals and the available CampusOne data.

Rules:
- Only recommend events present in <campus_data>, referenced by their exact id.
- Do not invent information about any event.
- Skip events whose registrationDeadline has already passed (today is {TODAY}), and skip generic announcements unless highly relevant.
- Prefer a diverse mix (not all the same category) when relevance is similar; favour events with deadlines coming up soon when relevance is equal.
- "score" is a match percentage 50-99 reflecting how well it fits the student.
- "reason" is ONE short sentence (max ~18 words) addressed to the student, explaining the specific match, e.g. "Matches your interest in AI and your goal to win hackathons."
- Return the top 6, best first.`;

const RECOMMEND_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          score: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['id', 'score', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
};

export async function recommend({ preferences, events }) {
  const system = RECOMMEND_SYSTEM.replace('{TODAY}', todayStr());
  const profile = `<student_profile>\nInterests: ${(preferences.interests || []).join(', ') || 'not specified'}\nGoals: ${(preferences.goals || []).join(', ') || 'not specified'}\nYear: ${preferences.year || 'not specified'}\n</student_profile>`;
  const result = await structuredCall({
    system,
    schema: RECOMMEND_SCHEMA,
    messages: [{ role: 'user', content: `${profile}\n\n<campus_data>\n${JSON.stringify(eventContext(events))}\n</campus_data>\n\nRank the best opportunities for this student.` }],
  });
  const byId = new Map(events.map((e) => [e.id, e]));
  return (result.recommendations || [])
    .filter((r) => byId.has(r.id))
    .map((r) => ({ id: r.id, score: Math.max(1, Math.min(99, Math.round(r.score))), reason: r.reason }))
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// 4. WHILE YOU WERE AWAY: digest of recent updates
// ---------------------------------------------------------------------------
const SUMMARY_SYSTEM = `You are CampusOne's campus digest writer.

Write a short "While you were away" digest of recent campus updates for a student who hasn't checked campus channels for a few days.

Rules:
- Use only the updates in <recent_updates>. Never invent anything.
- Today is {TODAY}.
- "headline": one friendly sentence like "You missed 9 campus updates this week. Here's what matters:" using the real count provided.
- "highlights": the 3-5 most important updates for this student, prioritising urgent deadlines and their interests. Each "text" is one crisp sentence (max ~16 words) that mentions the organiser or event and why it matters (e.g. a deadline). Include the event "id".`;

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    highlights: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, id: { type: 'string' } },
        required: ['text', 'id'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'highlights'],
  additionalProperties: false,
};

export async function summariseUpdates({ events, preferences }) {
  const system = SUMMARY_SYSTEM.replace('{TODAY}', todayStr());
  const interests = (preferences?.interests || []).join(', ') || 'general';
  const result = await structuredCall({
    system,
    schema: SUMMARY_SCHEMA,
    messages: [{ role: 'user', content: `Student interests: ${interests}\nNumber of updates: ${events.length}\n\n<recent_updates>\n${JSON.stringify(eventContext(events))}\n</recent_updates>` }],
  });
  const valid = new Set(events.map((e) => e.id));
  return {
    headline: result.headline,
    highlights: (result.highlights || []).filter((h) => valid.has(h.id)).slice(0, 5),
  };
}

export const claudeInfo = { model: MODEL, effort: EFFORT };

// ---------------------------------------------------------------------------
// 5. CAMPUS BUDDY: general-purpose chatbot (streaming), answers anything
// ---------------------------------------------------------------------------
const CHAT_SYSTEM = `You are Campus Buddy, the friendly AI chatbot inside CampusOne ("Everything on campus. One place."), built on Claude.

You can help students with anything: general knowledge, studies and exam prep, explaining concepts, coding and debugging, writing (emails, cover letters, resumes, SOPs), career advice, productivity, brainstorming project ideas, and everyday questions.

Guidelines:
- Be warm, clear and genuinely helpful, like a smart senior student. Get to the point.
- Use markdown when it helps: short paragraphs, "- " bullet lists, numbered steps, **bold** for key terms, and fenced code blocks with a language tag for code. No tables.
- Keep answers reasonably concise unless the student asks for depth or the task needs it (e.g. writing a full cover letter or code).
- For facts that may have changed recently (current office holders, news, prices), share what you know and mention it may have changed since your knowledge was last updated.
- Today's date is {TODAY}.

Campus context: you also have the student's CampusOne listings in <campus_data>. If the student asks about campus events, deadlines or opportunities, answer only from that data and never invent campus events, dates or venues; if it isn't there, say you couldn't find it in CampusOne. Don't bring up campus events unless relevant.`;

function compactEvents(events) {
  return events.map((e) => `${e.id} | ${e.title} | ${e.category} | ${e.organizer} | date ${e.date || 'TBA'} ${e.time || ''} | ${e.location || 'TBA'} | register by ${e.registrationDeadline || 'n/a'} | ${e.fee || ''} | ${e.prize || ''} | ${(e.tags || []).join(', ')}`).join('\n');
}

/**
 * Streams a chat reply. Calls onText(delta) for each text chunk.
 * Returns an object with abort() and a done promise.
 */
export function streamChat({ messages, events, preferences, onText }) {
  const c = getClient();
  const name = preferences?.name && preferences.name !== 'Student' ? `The student's name is ${preferences.name}. ` : '';
  const system = `${CHAT_SYSTEM.replace('{TODAY}', `${todayLong()} (${todayStr()})`)}${STYLE_RULE}\n\n${name}Interests: ${(preferences?.interests || []).join(', ') || 'not set'}.\n\n<campus_data>\n${compactEvents(events)}\n</campus_data>`;

  const clean = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== 'user') throw new AIError('Send a message first.', 'empty_input', 400);

  const stream = c.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: clean,
    output_config: { effort: EFFORT },
  });
  stream.on('text', (t) => onText(t));
  const done = stream.finalMessage().then(
    (msg) => {
      if (msg.stop_reason === 'refusal') throw new AIError("Claude can't help with that request.", 'refusal', 422);
      return msg;
    },
    (err) => { throw mapError(err); },
  );
  return { abort: () => stream.abort(), done };
}

// ---------------------------------------------------------------------------
// 6. AI TEAM BUILDER: understand a project and the roles/skills it needs
// ---------------------------------------------------------------------------
export const TEAM_INTERESTS = ['AI / ML', 'Web Development', 'App Development', 'Data Science', 'Cybersecurity', 'Cloud', 'UI/UX', 'Entrepreneurship', 'Competitive Programming', 'Open Source'];
const ROLE_ICONS = ['ml', 'frontend', 'backend', 'fullstack', 'design', 'mobile', 'data', 'cloud', 'security', 'product', 'other'];

const TEAM_ANALYSE_SYSTEM = `You are CampusOne's AI Team Builder.

Your job is to understand a student's project idea and determine which skills and roles are needed to build it successfully.

Extract realistic technical and non-technical roles.

Do not invent student information.

Only infer project requirements from the provided project description (and the event details, if an event is provided).

Return structured JSON matching the requested schema.

Keep recommendations practical for student hackathons and projects.

Field guidance:
- "projectName": a short, friendly project title in Title Case (2-5 words), e.g. "AI Study Assistant".
- "projectSummary": one sentence describing what is being built.
- "roles": 2-5 distinct roles the project needs, most important first. Each role has:
  - "role": a clear role title, e.g. "Frontend Developer", "Machine Learning Engineer", "UI/UX Designer".
  - "skills": 2-5 concrete, commonly used skill names (e.g. "React", "JavaScript", "Python", "Machine Learning", "Figma", "UI/UX"). Prefer standard names over long phrases.
  - "why": one short sentence on why the project needs this role.
  - "icon": the closest category from the allowed list.
  - "coveredByRequester": true only if the student clearly says they will handle this part themselves (e.g. "I'll do the ML" or "I'm a Python developer building the backend"); otherwise false. Roles the student says they need help with must be false.
- "projectTags": 2-5 short topic tags (e.g. "AI", "Education", "Web Development").
- "relatedInterests": interest areas from the allowed list that the project relates to.
- "idealTeamSize": a realistic total team size including the student (2-5). If an event specifies a team size, respect its limits.
- "followUpQuestion": if the description is too vague to identify roles with confidence, one short question to ask the student (e.g. "What role do you need help with?"); otherwise null.`;

const TEAM_ANALYSE_SCHEMA = {
  type: 'object',
  properties: {
    projectName: { type: 'string' },
    projectSummary: { type: 'string' },
    roles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          why: { type: 'string' },
          icon: { type: 'string', enum: ROLE_ICONS },
          coveredByRequester: { type: 'boolean' },
        },
        required: ['role', 'skills', 'why', 'icon', 'coveredByRequester'],
        additionalProperties: false,
      },
    },
    projectTags: { type: 'array', items: { type: 'string' } },
    relatedInterests: { type: 'array', items: { type: 'string', enum: TEAM_INTERESTS } },
    idealTeamSize: { type: 'integer' },
    followUpQuestion: nullableString,
  },
  required: ['projectName', 'projectSummary', 'roles', 'projectTags', 'relatedInterests', 'idealTeamSize', 'followUpQuestion'],
  additionalProperties: false,
};

export async function analyseProject({ description, event, requester }) {
  const eventText = event
    ? `\n\n<event>\nTitle: ${event.title}\nCategory: ${event.category}\nTeam size: ${event.teamSize || 'not specified'}\nTags: ${(event.tags || []).join(', ')}\nDescription: ${event.description || ''}\n</event>`
    : '';
  const selfText = requester?.skills?.length
    ? `\n\n<student_own_skills>\n${requester.skills.join(', ')}\n</student_own_skills>\nUse the student's own skills only to judge which roles they can cover themselves when their description implies it.`
    : '';
  const result = await structuredCall({
    system: TEAM_ANALYSE_SYSTEM,
    schema: TEAM_ANALYSE_SCHEMA,
    maxTokens: 4000,
    messages: [{ role: 'user', content: `<project_description>\n${description}\n</project_description>${eventText}${selfText}\n\nAnalyse the project and return the roles and skills it needs.` }],
  });
  const roles = (result.roles || [])
    .filter((r) => r && r.role && Array.isArray(r.skills) && r.skills.length)
    .slice(0, 5)
    .map((r) => ({ role: r.role, skills: r.skills.slice(0, 6), why: r.why || '', icon: ROLE_ICONS.includes(r.icon) ? r.icon : 'other', coveredByRequester: Boolean(r.coveredByRequester) }));
  if (!roles.length) throw new AIError("We couldn't identify roles for this project. Add a bit more detail.", 'empty', 422);
  return {
    projectName: result.projectName || 'My Project',
    projectSummary: result.projectSummary || '',
    roles,
    projectTags: (result.projectTags || []).slice(0, 6),
    relatedInterests: (result.relatedInterests || []).filter((i) => TEAM_INTERESTS.includes(i)),
    idealTeamSize: Math.max(2, Math.min(6, Math.round(result.idealTeamSize || 4))),
    followUpQuestion: result.followUpQuestion || null,
  };
}

// ---------------------------------------------------------------------------
// 7. TEAM COMPATIBILITY: explain why a group fits a project
// ---------------------------------------------------------------------------
const TEAM_EXPLAIN_SYSTEM = `You are CampusOne's team compatibility assistant.

Explain why a group of students is a good fit for a specific project based only on their provided skills, interests, goals, availability and experience.

Do not invent qualifications.

Be concise and practical.

Output:
- "explanation": 2-3 sentences (max ~60 words). Mention members by first name ("you" for the requesting student) and which project needs they cover. Do not quote numeric scores.
- "gap": if an important role or skill is not covered by anyone, one short sentence naming it and suggesting what kind of teammate to add; otherwise null.`;

const TEAM_EXPLAIN_SCHEMA = {
  type: 'object',
  properties: { explanation: { type: 'string' }, gap: nullableString },
  required: ['explanation', 'gap'],
  additionalProperties: false,
};

export async function explainTeam({ project, members, metrics, uncoveredRoles }) {
  const result = await structuredCall({
    system: TEAM_EXPLAIN_SYSTEM,
    schema: TEAM_EXPLAIN_SCHEMA,
    maxTokens: 2000,
    messages: [{
      role: 'user',
      content: `<project>\n${JSON.stringify(project)}\n</project>\n\n<team_members>\n${JSON.stringify(members)}\n</team_members>\n\n<computed_metrics note="heuristic CampusOne Match Score inputs, 0-100">\n${JSON.stringify(metrics)}\n</computed_metrics>\n\n<roles_not_clearly_covered>\n${JSON.stringify(uncoveredRoles)}\n</roles_not_clearly_covered>\n\nExplain this team's fit for the project.`,
    }],
  });
  return { explanation: String(result.explanation || '').trim(), gap: result.gap || null };
}

// ---------------------------------------------------------------------------
// 8. WEEKLY BRIEFING: "What should I focus on this week?"
// ---------------------------------------------------------------------------
const BRIEFING_SYSTEM = `You are CampusOne's weekly campus briefing writer.

Build a short, practical plan for one student for the next 7 days, using only the listings in <campus_data>.

Rules:
- Only reference listings by their exact id. Never invent events, dates or details.
- Today is {TODAY}. Skip listings whose registrationDeadline has passed.
- "headline": one sentence summarising the week for this student (max ~18 words, no numbers that aren't in the data).
- "items": up to 8 picks, each with:
  - "kind": "match" (strong fit for their interests/goals/skills), "deadline" (registration closes within 7 days and is worth acting on), or "portfolio" (hackathons, competitions or hands-on workshops that would produce a portfolio piece).
  - "reason": one sentence (max ~20 words) addressed to the student, specific to them.
- Aim for 2-3 "match", 1-3 "deadline", 1-2 "portfolio". An event can appear only once.`;

const BRIEFING_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { eventId: { type: 'string' }, kind: { type: 'string', enum: ['match', 'deadline', 'portfolio'] }, reason: { type: 'string' } },
        required: ['eventId', 'kind', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['headline', 'items'],
  additionalProperties: false,
};

export async function weeklyBriefing({ events, profile }) {
  const system = BRIEFING_SYSTEM.replace('{TODAY}', `${todayLong()} (${todayStr()})`);
  const who = `<student_profile>\nInterests: ${(profile.interests || []).join(', ') || 'not set'}\nGoals: ${(profile.goals || []).join(', ') || 'not set'}\nSkills: ${(profile.skills || []).join(', ') || 'not set'}\nAvailability: ${(profile.availability || []).join(', ') || 'not set'}\n</student_profile>`;
  const result = await structuredCall({
    system,
    schema: BRIEFING_SCHEMA,
    maxTokens: 3000,
    messages: [{ role: 'user', content: `${who}\n\n<campus_data>\n${JSON.stringify(eventContext(events))}\n</campus_data>\n\nWrite my briefing for this week.` }],
  });
  const valid = new Set(events.map((e) => e.id));
  const seen = new Set();
  const items = (result.items || []).filter((i) => valid.has(i.eventId) && !seen.has(i.eventId) && seen.add(i.eventId)).slice(0, 8);
  return { headline: result.headline, items };
}
