# CampusOne
### Everything on campus. One place.

CampusOne is an AI-powered campus hub. It brings hackathons, workshops, events, clubs, competitions, internships, scholarships and announcements into one place. **Claude is the intelligence layer**, not a chatbot bolted on at the end.

## Quick start

```bash
npm install
cp .env.example .env      # then add your ANTHROPIC_API_KEY (or export it in your shell)
npm run dev
```

- App: **http://localhost:5173**
- API: http://localhost:3001 (Vite proxies `/api` to it)

Production-style single server: `npm run build && npm start`, then open http://localhost:3001.

## Where Claude is used (`server/services/claudeService.js`)

| Feature | Endpoint | What Claude does |
|---|---|---|
| **AI Organise** | `POST /api/ai/organise` | Turns a messy WhatsApp/poster/email announcement into structured event JSON (JSON-schema structured outputs). Resolves relative dates. Missing fields come back as `null`, never invented. Also returns confidence and missing fields. |
| **Ask Campus** | `POST /api/ai/ask` | Grounded Q&A over CampusOne data only. Returns an answer plus referenced event IDs, which the UI renders as clickable cards. Says *"I couldn't find that information in CampusOne yet."* when the data doesn't cover the question. |
| **Recommendations** | `POST /api/ai/recommend` | Ranks opportunities for the student's interests and goals, with a match % and a one-line reason. |
| **While you were away** | `POST /api/ai/summarise` | A digest of the week's campus updates. |

| **AI Team Builder** | `POST /api/team/analyse` | Reads a project description (plus hackathon context when opened from an event) and returns the roles and skills the project needs, flagging roles the student covers themselves. Never sees or invents student data. |
| **Team compatibility** | `POST /api/team/compatibility` | Explains in 2-3 sentences why the selected team fits, based only on the members' profile data. Falls back to a plain-language local explanation. |

Model: `claude-opus-5-5` at `low` effort for snappy demo latency, with server-side refusal fallbacks enabled. The API key only ever exists on the server.

### Resilience
- No key, rate limits, timeouts, invalid JSON and API errors are mapped to friendly messages; the app never crashes.
- **Organise** falls back to manual entry. **Recommendations / digest** fall back to local tag matching. **Ask Campus** shows a retry button.

## Sign-in (Google OAuth)

Passport (`passport-google-oauth20`) + `express-session` in `server/auth.js`. The client secret and Google tokens stay on the server; the browser only gets an httpOnly session cookie.

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web application).
2. Authorised redirect URI: `http://localhost:5173/api/auth/google/callback` (dev) or `http://localhost:3001/api/auth/google/callback` (`npm start`).
3. Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` and `SESSION_SECRET` in `.env` (see `.env.example`) and restart the server.

Without Google credentials, a **"Continue as demo student (local only)"** button appears so the app stays testable. It is disabled when `NODE_ENV=production` or `ALLOW_DEMO_LOGIN=off`.

Public: browse, search, event details, opportunities, Ask Campus, AI Organise. Sign-in required: personalised recommendations, saving/registering, profile, Team Builder, invitations.

## AI Team Builder

Project description → Claude identifies roles and skills → CampusOne scores student profiles (`server/services/teamMatch.js`) → Claude explains the team's fit.

The **CampusOne Match Score** is a transparent heuristic, not an objective measure: skills 40%, interests 20%, goals 15%, availability 15%, project experience 10% (capped at 97%). Team compatibility combines technical coverage, interest alignment, availability overlap and experience.

- Profiles, teams and invitations live in `data/users.json` and `data/teams.json`. Delete them to reset.
- 8 fictional **demo profiles** (`server/data/students.js`) make matching demoable. Each one is labelled "Demo profile" in the UI.
- Privacy: teammate views never include email or Google IDs. Students can hide themselves from Team Builder in their profile.

## Demo script (≈3 min)
1. **Home**: "Campus info is scattered across WhatsApp groups, posters, club pages and notices." Show the hero, *While you were away*, categories and *Recommended for you* (match % + reason).
2. **Discover**: search "ai", filter *Hackathons* → *Registration open*. Open a card to show details and *Why this might be useful for you*.
3. **AI Organise**: click *WhatsApp forward* → **Organise with Claude** → structured card. Point out the "didn't invent missing details" note → **Add to CampusOne**. The event is now live in Discover.
4. **Ask Campus**: "I'm interested in AI and hackathons. What should I attend this month?"
5. Follow up: "Which registrations close this week?" → then **Deadlines** page.
6. **Team Builder**: sign in → **Team Builder** → *Try an example* → **Find My Team**. Show the requirements, match cards, then the Team Compatibility panel and Claude's explanation → **Invite & save team** → **My Team**. Also: open *Campus AI Hackathon* → **Find Teammates**.
7. Close: "CampusOne isn't another event board. It's an intelligent layer over campus information, helping students discover what matters before they miss it."

Reset demo-added events: `curl -X POST localhost:3001/api/demo/reset` (or delete `data/added-events.json`).

## Structure
```
server/  server.js · auth.js · routes/(ai, team).js · services/(claudeService, localMatch, teamMatch).js · data/(seed, store, users, students).js
src/     App.jsx · pages/ (Home, Discover, Deadlines, AskCampus, Organise, Preferences, Login, Onboarding, Profile, TeamBuilder, MyTeam) · components/ · lib/ · services/api.js
```
Seed data (28 opportunities) is generated relative to today's date, so deadlines always look realistic in a live demo.
