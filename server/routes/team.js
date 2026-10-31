// AI Team Builder API. Every route requires a signed-in student.
import { Router } from 'express';
import crypto from 'node:crypto';
import { requireUser } from '../auth.js';
import { getEvent } from '../data/store.js';
import { candidatePool, findStudent, publicProfile, upsertTeam, inviteToTeam, respondToInvitation, removeTeam, teamsFor } from '../data/users.js';
import { analyseProject, explainTeam, AIError } from '../services/claudeService.js';
import { matchCandidates, teamCompatibility, localExplanation } from '../services/teamMatch.js';

const router = Router();
router.use(requireUser);

const fail = (res, err) => res.status(err.status || 500).json({ error: err.message || 'Something went wrong', code: err.code || 'error' });
const isHackathonCtx = (event, analysis) => event?.category === 'Hackathon' || event?.category === 'Competition'
  || (analysis.projectTags || []).some((t) => /hackathon/i.test(t));

// Accept an analysis echoed back by the client, keeping only the expected shape.
function cleanAnalysis(a) {
  if (!a || typeof a !== 'object' || !Array.isArray(a.roles)) return null;
  const str = (v, n = 200) => (typeof v === 'string' ? v.slice(0, n) : '');
  const list = (v, n = 8) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 60)).slice(0, n) : []);
  const roles = a.roles.slice(0, 6).map((r) => ({ role: str(r?.role, 60), skills: list(r?.skills, 6), why: str(r?.why), icon: str(r?.icon, 20), coveredByRequester: Boolean(r?.coveredByRequester) })).filter((r) => r.role && r.skills.length);
  if (!roles.length) return null;
  return {
    projectName: str(a.projectName, 80), projectSummary: str(a.projectSummary, 300), roles,
    projectTags: list(a.projectTags), relatedInterests: list(a.relatedInterests, 10),
    idealTeamSize: Math.max(2, Math.min(6, Number(a.idealTeamSize) || 4)),
  };
}

// POST /api/team/analyse { description, eventId? } -> Claude analysis + ranked matches
router.post('/analyse', async (req, res) => {
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const event = req.body?.eventId ? getEvent(req.body.eventId) : null;
  if (description.length < 8) return res.status(400).json({ error: 'Tell us a little more about what you are building.', code: 'empty_input' });
  if (description.length > 3000) return res.status(400).json({ error: 'Description is too long (max 3000 characters).', code: 'too_long' });
  let analysis;
  try {
    analysis = await analyseProject({ description, event, requester: req.user });
  } catch (err) {
    console.warn('[team] analysis failed:', err.message);
    const e = err instanceof AIError ? err : new AIError('Analysis failed');
    return res.status(e.status || 502).json({ error: "We couldn't analyse your project right now. Please try again.", code: e.code, detail: e.message });
  }
  const pool = candidatePool(req.user.id);
  const { matches, neededRoles } = matchCandidates({ analysis, requester: req.user, candidates: pool, isHackathon: isHackathonCtx(event, analysis) });
  res.json({
    draftId: `team-${crypto.randomUUID().slice(0, 10)}`,
    analysis,
    event: event ? { id: event.id, title: event.title, category: event.category, teamSize: event.teamSize } : null,
    neededRoles,
    matches: matches.map((m) => ({ ...m, student: publicProfile(findStudent(m.studentId)) })),
    poolSize: pool.length,
  });
});

// POST /api/team/compatibility { analysis, memberIds, eventId? } -> metrics + Claude explanation
router.post('/compatibility', async (req, res) => {
  const analysis = cleanAnalysis(req.body?.analysis);
  if (!analysis) return res.status(400).json({ error: 'Missing project analysis.', code: 'bad_request' });
  const ids = Array.isArray(req.body?.memberIds) ? [...new Set(req.body.memberIds)].slice(0, 6) : [];
  const members = ids.map(findStudent).filter((s) => s && s.id !== req.user.id);
  if (!members.length) return res.status(400).json({ error: 'Select at least one teammate.', code: 'bad_request' });
  const event = req.body?.eventId ? getEvent(req.body.eventId) : null;
  const compat = teamCompatibility({ analysis, requester: req.user, members, isHackathon: isHackathonCtx(event, analysis) });

  const describe = (s, isYou) => ({
    name: isYou ? `${s.name} (you, the requesting student)` : s.name,
    skills: s.skills || [], interests: s.interests || [], goals: s.goals || [], availability: s.availability || [],
    projects: (s.projects || []).map((p) => p.name), hackathons: s.hackathons || [],
  });
  let text;
  let source = 'claude';
  try {
    text = await explainTeam({
      project: { name: analysis.projectName, summary: analysis.projectSummary, roles: analysis.roles.map((r) => ({ role: r.role, skills: r.skills, handledByRequester: r.coveredByRequester })) },
      members: [describe(req.user, true), ...members.map((m) => describe(m, false))],
      metrics: compat.metrics,
      uncoveredRoles: compat.uncoveredRoles,
    });
  } catch (err) {
    console.warn('[team] explanation fell back to local:', err.message);
    text = localExplanation({ ...compat, requesterName: req.user.name });
    source = 'local';
  }
  res.json({ ...compat, ...text, source });
});

// POST /api/team/invite { team: {id,name,summary,tags,roles,eventId,compatibility}, studentId, role }
router.post('/invite', (req, res) => {
  try {
    const team = upsertTeam(req.user.id, req.body?.team || {});
    const inv = inviteToTeam(req.user.id, team.id, String(req.body?.studentId || ''), req.body?.role);
    const student = publicProfile(findStudent(inv.studentId));
    res.status(201).json({ invitation: { ...inv, student }, teamId: team.id });
  } catch (err) {
    fail(res, err);
  }
});

// PUT /api/team/:id  -> update saved team details (e.g. compatibility)
router.put('/:id', (req, res) => {
  try {
    res.json({ team: upsertTeam(req.user.id, { ...(req.body || {}), id: req.params.id }) });
  } catch (err) {
    fail(res, err);
  }
});

router.delete('/:id', (req, res) => {
  try {
    removeTeam(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

// GET /api/team/mine -> my teams + invitations I received
router.get('/mine', (req, res) => res.json(teamsFor(req.user.id)));

router.post('/invitations/:id/respond', (req, res) => {
  try {
    res.json({ invitation: respondToInvitation(req.user.id, req.params.id, req.body?.accept === true) });
  } catch (err) {
    fail(res, err);
  }
});

// GET /api/team/students/:id -> public teammate profile (no email)
router.get('/students/:id', (req, res) => {
  const s = findStudent(req.params.id);
  if (!s || (!s.demo && !s.onboarded)) return res.status(404).json({ error: 'Student not found' });
  res.json({ student: publicProfile(s) });
});

export default router;
