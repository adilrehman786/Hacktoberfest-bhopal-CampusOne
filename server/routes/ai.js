import { Router } from 'express';
import { getEvents } from '../data/store.js';
import { organiseAnnouncement, askCampus, recommend, summariseUpdates, streamChat, weeklyBriefing, AIError, isConfigured } from '../services/claudeService.js';
import { localRecommend, localSummary, localBriefing } from '../services/localMatch.js';

const router = Router();

function sendError(res, err) {
  const status = err instanceof AIError ? err.status : 500;
  res.status(status).json({ error: err.message || 'Unexpected error', code: err.code || 'unknown' });
}

const prefsKey = (p = {}) => JSON.stringify([[...(p.interests || [])].sort(), [...(p.goals || [])].sort(), p.year || '', getEvents().length]);
const cache = new Map(); // simple in-memory cache for recommendations/summaries

// POST /api/ai/organise  { text }
router.post('/organise', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'Paste an announcement first.', code: 'empty_input' });
  if (text.length > 6000) return res.status(400).json({ error: 'Announcement is too long (max 6000 characters).', code: 'too_long' });
  try {
    const event = await organiseAnnouncement(text);
    res.json({ event });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/ai/ask  { question, history, preferences }
router.post('/ask', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) return res.status(400).json({ error: 'Ask a question first.', code: 'empty_input' });
  if (question.length > 1000) return res.status(400).json({ error: 'Question is too long.', code: 'too_long' });
  try {
    const result = await askCampus({
      question,
      history: Array.isArray(req.body.history) ? req.body.history : [],
      preferences: req.body.preferences,
      events: getEvents(),
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/ai/recommend  { preferences }  -> always succeeds (falls back to local matching)
router.post('/recommend', async (req, res) => {
  const preferences = req.body?.preferences || {};
  const events = getEvents();
  const key = `rec:${prefsKey(preferences)}`;
  if (cache.has(key)) return res.json(cache.get(key));
  try {
    const recommendations = await recommend({ preferences, events });
    if (!recommendations.length) throw new AIError('No recommendations returned', 'empty', 502);
    const payload = { recommendations, source: 'claude' };
    cache.set(key, payload);
    res.json(payload);
  } catch (err) {
    console.warn('[recommend] falling back to local matching:', err.message);
    res.json({ recommendations: localRecommend({ preferences, events }), source: 'local', notice: err.message });
  }
});

// POST /api/ai/summarise  { preferences } -> "While you were away"
router.post('/summarise', async (req, res) => {
  const preferences = req.body?.preferences || {};
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const recent = getEvents().filter((e) => e.postedAt && e.postedAt >= weekAgo);
  const key = `sum:${prefsKey(preferences)}`;
  if (cache.has(key)) return res.json(cache.get(key));
  try {
    const summary = await summariseUpdates({ events: recent, preferences });
    const payload = { ...summary, count: recent.length, source: 'claude' };
    cache.set(key, payload);
    res.json(payload);
  } catch (err) {
    console.warn('[summarise] falling back to local summary:', err.message);
    res.json({ ...localSummary({ events: recent }), count: recent.length, source: 'local' });
  }
});

// POST /api/ai/chat  { messages, preferences }  -> Server-Sent Events stream
router.post('/chat', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  let chat;
  try {
    chat = streamChat({
      messages,
      preferences: req.body?.preferences,
      events: getEvents(),
      onText: (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`),
    });
  } catch (err) {
    return sendError(res, err);
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.on('close', () => { if (!res.writableEnded) chat.abort(); });
  try {
    await chat.done;
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    if (!res.writableEnded && !res.destroyed) {
      const e = err instanceof AIError ? err : new AIError('Something went wrong talking to Claude.');
      res.write(`data: ${JSON.stringify({ error: e.message, code: e.code })}\n\n`);
    }
  }
  res.end();
});

// POST /api/ai/briefing  { preferences } -> weekly plan (uses the signed-in profile when available)
router.post('/briefing', async (req, res) => {
  const p = req.body?.preferences || {};
  const u = req.user;
  const profile = u ? { interests: u.interests, goals: u.goals, skills: u.skills, availability: u.availability } : { interests: p.interests, goals: p.goals };
  const events = getEvents();
  try {
    const out = await weeklyBriefing({ events, profile });
    if (!out.items.length) throw new AIError('Empty briefing', 'empty', 502);
    res.json({ ...out, source: 'claude', personalised: Boolean(u) });
  } catch (err) {
    console.warn('[briefing] falling back to local:', err.message);
    res.json({ ...localBriefing({ events, preferences: profile }), source: 'local', personalised: Boolean(u) });
  }
});

router.get('/status', (_req, res) => res.json({ configured: isConfigured() }));

export default router;
