// CampusOne Match Score: a transparent heuristic, not a scientific measure.
// Weights (per candidate): skills 40, interests 20, goals 15, availability 15, experience 10.

const norm = (s) => String(s || '').toLowerCase().replace(/\.js\b/g, '').replace(/[^a-z0-9+#/ ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Related-skill families: a match inside a family counts as partial credit.
const FAMILIES = [
  ['react', 'reactjs', 'next', 'nextjs', 'vue', 'angular', 'svelte', 'frontend', 'front end', 'ui development', 'html', 'css', 'tailwind css', 'tailwind', 'javascript', 'typescript', 'web development'],
  ['node', 'nodejs', 'express', 'backend', 'back end', 'rest apis', 'rest api', 'api', 'apis', 'spring boot', 'fastapi', 'django', 'flask', 'java', 'go', 'server'],
  ['ui/ux', 'ui', 'ux', 'ui design', 'ux design', 'figma', 'prototyping', 'wireframing', 'user research', 'product design', 'design', 'interaction design', 'adobe xd'],
  ['machine learning', 'ml', 'deep learning', 'pytorch', 'tensorflow', 'scikit learn', 'nlp', 'computer vision', 'ai', 'llms', 'llm', 'generative ai', 'model training'],
  ['python', 'pandas', 'numpy', 'fastapi', 'django', 'flask'],
  ['sql', 'postgresql', 'mysql', 'mongodb', 'database', 'databases', 'firebase', 'supabase'],
  ['flutter', 'dart', 'kotlin', 'android', 'ios', 'swift', 'react native', 'mobile', 'mobile development', 'app development'],
  ['aws', 'gcp', 'azure', 'docker', 'kubernetes', 'ci/cd', 'devops', 'cloud', 'linux', 'deployment'],
  ['data science', 'data analysis', 'data visualization', 'power bi', 'tableau', 'pandas', 'statistics', 'analytics'],
  ['cybersecurity', 'network security', 'security', 'penetration testing', 'ctf', 'linux'],
  ['product management', 'pitching', 'presentation', 'market research', 'business', 'entrepreneurship', 'go to market'],
];
const familiesOf = (s) => FAMILIES.map((f, i) => (f.includes(s) ? i : -1)).filter((i) => i >= 0);

/** 1 = same skill, 0.6 = related skill, 0 = no match. */
function skillMatch(required, have) {
  const r = norm(required);
  const h = norm(have);
  if (!r || !h) return 0;
  if (r === h) return 1;
  // Whole-word containment only ("react" in "react native" yes, "java" in "javascript" no).
  const words = (s) => ` ${s} `;
  if (r.length >= 3 && h.length >= 3 && (words(r).includes(words(h)) || words(h).includes(words(r)))) return 1;
  const fr = familiesOf(r);
  if (fr.length && familiesOf(h).some((i) => fr.includes(i))) return 0.6;
  return 0;
}

const bestMatch = (required, skills) => skills.reduce((best, s) => {
  const m = skillMatch(required, s);
  return m > best.score ? { score: m, skill: s } : best;
}, { score: 0, skill: null });

/** How well a skill list covers a role: 0..1, plus which skills matched. */
function roleFit(role, skills) {
  // Each of the student's skills can satisfy only one requirement (no double counting).
  const left = [...skills];
  const hits = role.skills.map((req) => {
    const m = bestMatch(req, left);
    if (m.skill) left.splice(left.indexOf(m.skill), 1);
    return { req, ...m };
  });
  const total = hits.reduce((s, h) => s + h.score, 0);
  const needed = Math.max(1, Math.ceil(role.skills.length * 0.6)); // ~60% of listed skills = full fit
  const matched = [...new Set(hits.filter((h) => h.score >= 1).map((h) => h.skill))];
  const related = [...new Set(hits.filter((h) => h.score > 0 && h.score < 1).map((h) => h.skill))].filter((s) => !matched.includes(s));
  // `raw` (unclamped) breaks ties between roles: more exact skill hits = more specialised fit.
  return { fit: Math.min(1, total / needed), raw: total + matched.length * 0.1, matched, related };
}

// Best assignment of distinct candidates to roles (small brute force: <= 8 candidates, <= 5 roles).
function assignRoles(roles, matches, slots) {
  let best = { value: -1, picks: [] };
  const pool = matches.slice(0, 8);
  const walk = (ri, used, picks, value) => {
    if (ri === roles.length || picks.length === slots) {
      if (value > best.value) best = { value, picks: [...picks] };
      return;
    }
    walk(ri + 1, used, picks, value); // leave this role open
    for (const m of pool) {
      const fit = m.roleFits[roles[ri].role] || 0;
      if (used.has(m.studentId) || fit < 50) continue;
      used.add(m.studentId);
      picks.push({ m, role: roles[ri].role });
      walk(ri + 1, used, picks, value + fit * 0.7 + m.score * 0.3 + 100);
      picks.pop();
      used.delete(m.studentId);
    }
  };
  walk(0, new Set(), [], 0);
  return best.picks;
}

function interestScore(student, analysis) {
  const want = analysis.relatedInterests || [];
  if (!want.length) return { score: 0.5, hits: [] };
  const hits = (student.interests || []).filter((i) => want.includes(i));
  return { score: Math.min(1, hits.length / Math.min(2, want.length)), hits };
}

function goalScore(student, isHackathon) {
  const weights = isHackathon
    ? { 'Win hackathons': 1, 'Build projects': 0.85, 'Build a portfolio': 0.75, 'Learn new skills': 0.55, 'Meet other students': 0.5 }
    : { 'Build projects': 1, 'Build a portfolio': 0.85, 'Win hackathons': 0.75, 'Learn new skills': 0.55, 'Meet other students': 0.5 };
  let best = { score: 0.2, goal: null };
  for (const g of student.goals || []) if ((weights[g] || 0) > best.score) best = { score: weights[g], goal: g };
  return best;
}

function availabilityOverlap(a = [], b = []) {
  if (!a.length || !b.length || a.includes('Flexible') || b.includes('Flexible')) {
    const common = a.filter((x) => b.includes(x));
    return { score: !a.length || !b.length ? 0.85 : 1, common: common.length ? common : (b.includes('Flexible') ? ['Flexible'] : b.slice(0, 1)) };
  }
  const common = a.filter((x) => b.includes(x));
  return { score: common.length ? 1 : 0.35, common };
}

function experienceScore(student, analysis) {
  const keywords = [...analysis.roles.flatMap((r) => r.skills), ...(analysis.projectTags || [])];
  const projects = student.projects || [];
  const relevant = projects.find((p) => [...(p.tags || []), p.name, p.description].some((t) => keywords.some((k) => skillMatch(k, t) >= 0.6)));
  const hack = (student.hackathons || []).length > 0;
  if (relevant) return { score: hack ? 1 : 0.8, project: relevant.name, hack };
  return { score: Math.min(1, (projects.length ? 0.35 : 0) + (hack ? 0.35 : 0)), project: null, hack };
}

const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Score every candidate against the roles the requester still needs. */
export function matchCandidates({ analysis, requester, candidates, isHackathon }) {
  const needed = analysis.roles.filter((r) => !r.coveredByRequester);
  const roles = needed.length ? needed : analysis.roles;

  const scored = candidates.map((c) => {
    const skills = c.skills || [];
    const fits = roles.map((r) => ({ role: r, ...roleFit(r, skills) })).sort((a, b) => b.fit - a.fit || b.raw - a.raw);
    const best = fits[0];
    const interest = interestScore(c, analysis);
    const goal = goalScore(c, isHackathon);
    const avail = availabilityOverlap(requester?.availability || [], c.availability || []);
    const exp = experienceScore(c, analysis);
    const breakdown = { skills: pct(best.fit), interests: pct(interest.score), goals: pct(goal.score), availability: pct(avail.score), experience: pct(exp.score) };
    // Capped at 97: it's a heuristic, so never present a "perfect" match.
    const score = Math.min(97, Math.round(best.fit * 40 + interest.score * 20 + goal.score * 15 + avail.score * 15 + exp.score * 10));

    const reasons = [];
    const shownSkills = [...best.matched, ...best.related].slice(0, 3);
    if (best.fit >= 0.8 && shownSkills.length) reasons.push(`Strong ${best.role.role} fit: ${shownSkills.join(', ')}`);
    else if (shownSkills.length) reasons.push(`Relevant skills: ${shownSkills.join(', ')}`);
    if (exp.project) reasons.push(`Built ${exp.project}`);
    if (interest.hits.length) reasons.push(`Interested in ${interest.hits.slice(0, 2).join(' and ')}`);
    else if (goal.goal) reasons.push(`Wants to ${lower(goal.goal)}`);
    if (avail.score >= 1 && avail.common.length) reasons.push(`Available ${avail.common.slice(0, 2).map(lower).join(' and ')}`);

    return {
      studentId: c.id,
      role: best.role.role,
      roleFit: pct(best.fit),
      roleFits: Object.fromEntries(fits.map((f) => [f.role.role, pct(f.fit)])),
      score,
      breakdown,
      reasons: reasons.slice(0, 3),
      matchedSkills: shownSkills,
    };
  });

  const matches = scored
    .filter((m) => m.roleFit >= 30 && m.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // Suggested team: best available student per needed role, up to the ideal size.
  const slots = Math.max(1, (analysis.idealTeamSize || 4) - 1);
  for (const { m, role } of assignRoles(roles, matches, slots)) {
    m.role = role;
    m.suggested = true;
  }
  return { matches, neededRoles: roles.map((r) => r.role) };
}

/** Team-level metrics for the requester + selected teammates. */
export function teamCompatibility({ analysis, requester, members, isHackathon }) {
  const everyone = [requester, ...members].filter(Boolean);
  const allSkills = everyone.flatMap((m) => m.skills || []);

  // Technical coverage: required skills covered + roles with a clear owner.
  const required = [...new Set(analysis.roles.flatMap((r) => r.skills))];
  const skillCov = required.length ? required.reduce((s, req) => s + bestMatch(req, allSkills).score, 0) / required.length : 1;
  const roleOwners = analysis.roles.map((r) => {
    if (r.coveredByRequester) return { role: r.role, owner: requester?.name || 'You', fit: 1 };
    const best = everyone.map((m) => ({ m, ...roleFit(r, m.skills || []) })).sort((a, b) => b.fit - a.fit || b.raw - a.raw)[0];
    return { role: r.role, owner: best && best.fit >= 0.5 ? best.m.name : null, fit: best ? best.fit : 0 };
  });
  const roleCov = roleOwners.reduce((s, r) => s + Math.min(1, r.fit), 0) / Math.max(1, roleOwners.length);
  const technical = 0.5 * skillCov + 0.5 * roleCov;

  const interest = everyone.reduce((s, m) => s + interestScore(m, analysis).score, 0) / everyone.length;
  const goals = everyone.reduce((s, m) => s + goalScore(m, isHackathon).score, 0) / everyone.length;

  let pairs = 0;
  let pairSum = 0;
  for (let i = 0; i < everyone.length; i++) {
    for (let j = i + 1; j < everyone.length; j++) {
      pairs++;
      pairSum += availabilityOverlap(everyone[i].availability || [], everyone[j].availability || []).score;
    }
  }
  const availability = pairs ? pairSum / pairs : 1;
  const expPool = members.length ? members : everyone;
  const experience = expPool.reduce((s, m) => s + experienceScore(m, analysis).score, 0) / expPool.length;

  const metrics = {
    technicalCoverage: pct(technical),
    interestAlignment: pct(0.75 * interest + 0.25 * goals),
    availability: pct(availability),
    projectExperience: pct(experience),
  };
  const overall = Math.round(metrics.technicalCoverage * 0.45 + metrics.interestAlignment * 0.2 + metrics.availability * 0.2 + metrics.projectExperience * 0.15);
  return { overall, metrics, roleOwners, uncoveredRoles: roleOwners.filter((r) => !r.owner).map((r) => r.role) };
}

/** Plain-language fallback when Claude is unavailable. */
export function localExplanation({ roleOwners, uncoveredRoles, requesterName }) {
  const byOwner = new Map();
  for (const r of roleOwners.filter((x) => x.owner)) byOwner.set(r.owner, [...(byOwner.get(r.owner) || []), r.role]);
  const parts = [...byOwner].map(([owner, roles]) => (owner === requesterName
    ? `you cover the ${roles.join(' and ')} work`
    : `${String(owner).split(' ')[0]} brings ${roles.join(' and ')} skills`));
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  const explanation = parts.length
    ? `${joined.charAt(0).toUpperCase()}${joined.slice(1)}. Together the team covers the core requirements identified for the project.`
    : 'This team does not clearly cover the core roles yet. Try adding teammates with the required skills.';
  return { explanation, gap: uncoveredRoles.length ? `Nobody clearly covers ${uncoveredRoles.join(' and ')} yet. Consider adding a teammate for it.` : null };
}
