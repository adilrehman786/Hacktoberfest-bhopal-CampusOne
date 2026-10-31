// Tiny persistence layer: seed data + user-added events saved to a JSON file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSeed } from './seed.js';
import { humanize } from '../services/claudeService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ADDED_FILE = path.join(DATA_DIR, 'added-events.json');

function loadAdded() {
  try {
    return JSON.parse(fs.readFileSync(ADDED_FILE, 'utf8'));
  } catch {
    return [];
  }
}

let added = loadAdded();
const seed = generateSeed();

export function getEvents() {
  // Newly added events first so they are easy to spot in the demo.
  return [...added, ...seed];
}

export function getEvent(id) {
  return getEvents().find((e) => e.id === id) || null;
}

const str = (v, max = 500) => (typeof v === 'string' && v.trim() ? humanize(v.trim()).slice(0, max) : null);
const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

const CATEGORIES = ['Hackathon', 'Event', 'Workshop', 'Competition', 'Club', 'Internship', 'Scholarship', 'Announcement', 'Seminar'];

export function addEvent(input) {
  const title = str(input.title, 140);
  if (!title) throw Object.assign(new Error('Title is required'), { status: 400 });
  const category = CATEGORIES.includes(input.category) ? input.category : 'Event';
  const today = new Date().toISOString().slice(0, 10);
  const event = {
    id: `usr-${Date.now().toString(36)}`,
    title,
    category,
    organizer: str(input.organizer, 120) || 'Campus community',
    description: str(input.description, 1200) || '',
    date: isoDate(input.date),
    time: str(input.time, 80),
    location: str(input.location, 140),
    mode: ['Online', 'Offline', 'Hybrid'].includes(input.mode) ? input.mode : (/online|meet|zoom|discord/i.test(input.location || '') ? 'Online' : 'Offline'),
    registrationDeadline: isoDate(input.registrationDeadline),
    eligibility: str(input.eligibility, 200),
    teamSize: str(input.teamSize, 60),
    prize: str(input.prize, 140),
    fee: str(input.fee, 60) || 'Free',
    tags: Array.isArray(input.tags) ? input.tags.map((t) => str(t, 30)).filter(Boolean).slice(0, 8) : [],
    postedAt: today,
    registrationLink: str(input.registrationLink, 300),
    source: input.source === 'ai' ? 'ai' : 'manual',
  };
  added = [event, ...added];
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ADDED_FILE, JSON.stringify(added, null, 2));
  } catch (err) {
    console.warn('Could not persist added events:', err.message);
  }
  return event;
}

export function resetAdded() {
  added = [];
  try { fs.unlinkSync(ADDED_FILE); } catch { /* nothing to reset */ }
}
