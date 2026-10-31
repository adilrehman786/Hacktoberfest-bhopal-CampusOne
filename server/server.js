import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import aiRouter from './routes/ai.js';
import teamRouter from './routes/team.js';
import authRouter, { setupAuth, googleConfigured, demoLoginEnabled } from './auth.js';
import { getEvents, getEvent, addEvent, resetAdded } from './data/store.js';
import { claudeInfo, isConfigured } from './services/claudeService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '200kb' }));
setupAuth(app);

app.get('/api/health', (_req, res) => res.json({ ok: true, claude: isConfigured(), google: googleConfigured(), ...claudeInfo }));

app.get('/api/events', (_req, res) => res.json({ events: getEvents() }));
app.get('/api/events/:id', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({ event });
});
app.post('/api/events', (req, res) => {
  try {
    res.status(201).json({ event: addEvent(req.body || {}) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
app.post('/api/demo/reset', (_req, res) => {
  resetAdded();
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/team', teamRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the production build if it exists (npm run build && npm start).
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.type === 'entity.parse.failed' ? 'Invalid JSON body' : 'Server error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n  CampusOne API running on http://localhost:${PORT}`);
  console.log(`  Claude: ${isConfigured() ? `enabled (${claudeInfo.model}, effort ${claudeInfo.effort})` : 'NOT configured. Set ANTHROPIC_API_KEY in .env (fallbacks active)'}`);
  console.log(`  Google sign-in: ${googleConfigured() ? 'enabled' : 'NOT configured. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET'}${demoLoginEnabled() ? ' (local demo sign-in available)' : ''}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`
  Port ${PORT} is already in use. Stop the other CampusOne server or set PORT=3002.
`);
  else console.error(err);
  process.exit(1);
});
