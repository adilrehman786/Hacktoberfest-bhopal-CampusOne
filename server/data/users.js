// CampusOne student profiles + teams, persisted to small JSON files (MVP storage).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEMO_STUDENTS } from './students.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

function load(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function save(file, value) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch (err) {
    console.warn(`Could not persist ${path.basename(file)}:`, err.message);
  }
}

let users = load(USERS_FILE, []);
let store = load(TEAMS_FILE, { teams: [], invitations: [] });

export const OPTIONS = {
  interests: ['AI / ML', 'Web Development', 'App Development', 'Data Science', 'Cybersecurity', 'Cloud', 'UI/UX', 'Entrepreneurship', 'Competitive Programming', 'Open Source'],
  goals: ['Win hackathons', 'Build projects', 'Find internships', 'Learn new skills', 'Join clubs', 'Meet other students', 'Build a portfolio', 'Get scholarships'],
  availability: ['Weekdays', 'Weekends', 'Evenings', 'Flexible'],
};

const cleanStr = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanList = (v, allowed, max = 20) => {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const x of v) {
    const s = cleanStr(x, 40);
    if (!s || (allowed && !allowed.includes(s))) continue;
    if (!out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out.slice(0, max);
};
const cleanProjects = (v) => (Array.isArray(v) ? v : [])
  .map((p) => ({ name: cleanStr(p?.name, 80), description: cleanStr(p?.description, 240), tags: cleanList(p?.tags, null, 8) }))
  .filter((p) => p.name)
  .slice(0, 10);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export function getUser(id) {
  return users.find((u) => u.id === id) || null;
}

/** Create or refresh a user from a verified Google profile. */
export function upsertGoogleUser({ googleId, email, name, picture }) {
  let user = users.find((u) => u.googleId === googleId);
  if (user) {
    Object.assign(user, { email: email || user.email, picture: picture || user.picture, lastLoginAt: new Date().toISOString() });
    if (!user.name) user.name = name;
  } else {
    user = {
      id: `usr-${crypto.randomUUID().slice(0, 12)}`,
      googleId,
      email: email || '',
      name: name || 'Student',
      picture: picture || null,
      year: '',
      headline: '',
      interests: [],
      goals: [],
      skills: [],
      availability: [],
      projects: [],
      hackathons: [],
      onboarded: false,
      discoverable: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    users.push(user);
  }
  save(USERS_FILE, users);
  return user;
}

export function updateProfile(id, input = {}) {
  const user = getUser(id);
  if (!user) return null;
  if ('name' in input) user.name = cleanStr(input.name, 80) || user.name;
  if ('year' in input) user.year = cleanStr(input.year, 30);
  if ('headline' in input) user.headline = cleanStr(input.headline, 160);
  if ('interests' in input) user.interests = cleanList(input.interests, OPTIONS.interests);
  if ('goals' in input) user.goals = cleanList(input.goals, OPTIONS.goals);
  if ('skills' in input) user.skills = cleanList(input.skills, null, 25);
  if ('availability' in input) user.availability = cleanList(input.availability, OPTIONS.availability);
  if ('projects' in input) user.projects = cleanProjects(input.projects);
  if ('hackathons' in input) user.hackathons = cleanList(input.hackathons, null, 10);
  if ('discoverable' in input) user.discoverable = input.discoverable !== false;
  if ('onboarded' in input) user.onboarded = Boolean(input.onboarded);
  save(USERS_FILE, users);
  return user;
}

/** What the signed-in user sees about themselves (no Google id / tokens). */
export function privateProfile(u) {
  if (!u) return null;
  const { googleId, ...rest } = u;
  return rest;
}

/** What other students see. Email is never exposed for teammate discovery. */
export function publicProfile(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    picture: u.picture || null,
    year: u.year || '',
    headline: u.headline || '',
    interests: u.interests || [],
    goals: u.goals || [],
    skills: u.skills || [],
    availability: u.availability || [],
    projects: u.projects || [],
    hackathons: u.hackathons || [],
    demo: Boolean(u.demo),
  };
}

/** Everyone eligible for matching: real, onboarded, discoverable students + demo profiles. */
export function candidatePool(excludeId) {
  const real = users.filter((u) => u.id !== excludeId && u.onboarded && u.discoverable !== false);
  return [...real, ...DEMO_STUDENTS];
}

export function findStudent(id) {
  return getUser(id) || DEMO_STUDENTS.find((s) => s.id === id) || null;
}

// ---------------------------------------------------------------------------
// Teams + invitations
// ---------------------------------------------------------------------------
const persistTeams = () => save(TEAMS_FILE, store);

export function upsertTeam(ownerId, draft = {}) {
  const id = cleanStr(draft.id, 60) || `team-${crypto.randomUUID().slice(0, 10)}`;
  let team = store.teams.find((t) => t.id === id);
  if (team && team.ownerId !== ownerId) throw Object.assign(new Error('Not your team'), { status: 403 });
  const fields = {
    name: cleanStr(draft.name, 80) || 'My project team',
    summary: cleanStr(draft.summary, 300),
    tags: cleanList(draft.tags, null, 8),
    roles: (Array.isArray(draft.roles) ? draft.roles : []).slice(0, 8).map((r) => ({ role: cleanStr(r?.role, 60), skills: cleanList(r?.skills, null, 8), coveredByRequester: Boolean(r?.coveredByRequester) })).filter((r) => r.role),
    eventId: cleanStr(draft.eventId, 40) || null,
    compatibility: draft.compatibility && typeof draft.compatibility === 'object' ? {
      overall: Number(draft.compatibility.overall) || 0,
      metrics: draft.compatibility.metrics || {},
      explanation: cleanStr(draft.compatibility.explanation, 800),
    } : team?.compatibility || null,
    updatedAt: new Date().toISOString(),
  };
  if (team) Object.assign(team, fields);
  else {
    team = { id, ownerId, members: [], createdAt: new Date().toISOString(), ...fields };
    store.teams.unshift(team);
  }
  persistTeams();
  return team;
}

export function inviteToTeam(ownerId, teamId, studentId, role) {
  const team = store.teams.find((t) => t.id === teamId && t.ownerId === ownerId);
  if (!team) throw Object.assign(new Error('Team not found'), { status: 404 });
  if (studentId === ownerId) throw Object.assign(new Error("You're already on this team"), { status: 400 });
  const student = findStudent(studentId);
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
  let inv = store.invitations.find((i) => i.teamId === teamId && i.studentId === studentId);
  if (inv) {
    // Re-inviting someone who declined resets it to pending.
    if (inv.status === 'declined') inv.status = 'pending';
    if (role) inv.role = cleanStr(role, 60);
  } else {
    inv = { id: `inv-${crypto.randomUUID().slice(0, 10)}`, teamId, studentId, fromId: ownerId, role: cleanStr(role, 60), status: 'pending', createdAt: new Date().toISOString() };
    store.invitations.push(inv);
  }
  persistTeams();
  return inv;
}

export function respondToInvitation(userId, invId, accept) {
  const inv = store.invitations.find((i) => i.id === invId && i.studentId === userId);
  if (!inv) throw Object.assign(new Error('Invitation not found'), { status: 404 });
  inv.status = accept ? 'accepted' : 'declined';
  const team = store.teams.find((t) => t.id === inv.teamId);
  if (team && accept && !team.members.some((m) => m.studentId === userId)) team.members.push({ studentId: userId, role: inv.role });
  persistTeams();
  return inv;
}

export function removeTeam(ownerId, teamId) {
  const before = store.teams.length;
  store.teams = store.teams.filter((t) => !(t.id === teamId && t.ownerId === ownerId));
  if (store.teams.length === before) throw Object.assign(new Error('Team not found'), { status: 404 });
  store.invitations = store.invitations.filter((i) => i.teamId !== teamId);
  persistTeams();
}

const personCard = (s) => {
  const p = publicProfile(s);
  return p && { id: p.id, name: p.name, picture: p.picture, skills: p.skills.slice(0, 5), demo: p.demo };
};

/** Teams owned by or joined by the user, plus invitations they received. */
export function teamsFor(userId) {
  const mine = store.teams.filter((t) => t.ownerId === userId || t.members.some((m) => m.studentId === userId));
  const teams = mine.map((t) => {
    const invs = store.invitations.filter((i) => i.teamId === t.id);
    return {
      ...t,
      isOwner: t.ownerId === userId,
      owner: personCard(findStudent(t.ownerId)),
      members: t.members.map((m) => ({ ...m, student: personCard(findStudent(m.studentId)) })).filter((m) => m.student),
      invitations: t.ownerId === userId
        ? invs.map((i) => ({ id: i.id, role: i.role, status: i.status, createdAt: i.createdAt, student: personCard(findStudent(i.studentId)) })).filter((i) => i.student)
        : [],
    };
  });
  const received = store.invitations
    .filter((i) => i.studentId === userId && i.status === 'pending')
    .map((i) => {
      const t = store.teams.find((x) => x.id === i.teamId);
      return t && { id: i.id, role: i.role, createdAt: i.createdAt, team: { id: t.id, name: t.name, summary: t.summary, tags: t.tags }, from: personCard(findStudent(t.ownerId)) };
    })
    .filter(Boolean);
  return { teams, received };
}
