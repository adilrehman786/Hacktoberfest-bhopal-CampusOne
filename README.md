# CampusOne

**Everything on campus. One place.**

CampusOne is an AI-powered campus discovery and management platform designed to centralise hackathons, workshops, events, clubs, competitions, internships, scholarships, and announcements.

The platform uses Anthropic Claude as its intelligence layer to transform unstructured campus information into structured opportunities, provide contextual answers, generate personalised recommendations, and help students discover compatible teammates.

**Live Application:** https://hacktoberfest-bhopal-campusone-1.onrender.com/

---

## Overview

Campus information is often distributed across multiple channels, including WhatsApp groups, posters, emails, and institutional websites. This makes it difficult for students to discover relevant opportunities and keep track of important deadlines.

CampusOne addresses this problem through a unified platform that combines opportunity discovery, AI-powered information processing, personalised recommendations, and collaborative team building.

## Core Features

### AI-Powered Announcement Processing

Converts unstructured announcements from messages, posters, and emails into structured event information using Claude.

- Extracts relevant event details.
- Resolves relative dates.
- Identifies missing information without generating fabricated values.
- Returns confidence scores and missing fields.
- Supports manual review before publishing.

### Ask Campus

A context-aware question-answering system grounded in available CampusOne data.

- Answers questions about campus opportunities.
- References relevant event identifiers.
- Displays referenced opportunities as interactive cards.
- Provides fallback responses when information is unavailable.

### Personalised Recommendations

Ranks opportunities based on individual student interests and goals.

- AI-assisted opportunity ranking.
- Match percentage and relevance explanations.
- Local tag-matching fallback.

### Campus Activity Digest

Generates a summary of recent campus updates to help students catch up on opportunities and announcements they may have missed.

### AI Team Builder

Analyses project descriptions and identifies the skills and roles required to build a team.

- Extracts project requirements.
- Identifies technical and non-technical roles.
- Matches student profiles against project requirements.
- Highlights skills already covered by the student.
- Generates team compatibility explanations.

### Team Compatibility

Evaluates potential teams using a weighted compatibility model based on technical skills, interests, goals, availability, and project experience.

### Authentication and User Profiles

Google OAuth authentication implemented using Passport.js and Express sessions.

- Server-side OAuth credential management.
- HTTP-only session cookies.
- Protected personalised features.
- Student profiles and team invitations.

### Opportunity Discovery and Deadlines

Provides a centralised interface to explore campus opportunities through search, category filters, event details, and registration deadline tracking.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express.js |
| Programming Language | JavaScript |
| AI Integration | Anthropic Claude API |
| Authentication | Google OAuth 2.0, Passport.js |
| Session Management | Express Session |
| Data Storage | JSON-based storage |
| Deployment | Render |

## System Architecture

```text
                 Client
                   |
                   v
             React + Vite
                   |
                   v
            Express Server
                   |
        +----------+-----------+
        |          |           |
        v          v           v
     AI Routes   Auth Routes  Team Routes
        |          |           |
        v          v           v
   Claude API   Google OAuth  Matching Engine
        |
        v
   Structured Responses
        |
        v
    JSON Storage
```

The frontend communicates with the Express backend through REST APIs. The backend manages authentication, application data, AI requests, and team matching operations.

## AI Integration

Claude is integrated into multiple application workflows through a dedicated backend service.

| Endpoint | Function |
|---|---|
| `POST /api/ai/organise` | Converts unstructured announcements into structured event data. |
| `POST /api/ai/ask` | Provides grounded question answering over CampusOne data. |
| `POST /api/ai/recommend` | Generates personalised opportunity recommendations. |
| `POST /api/ai/summarise` | Generates a summary of recent campus updates. |
| `POST /api/team/analyse` | Identifies project roles and required skills. |
| `POST /api/team/compatibility` | Explains team compatibility. |

**AI Provider:** Anthropic Claude API

API credentials are maintained on the server and are not exposed to the frontend.

## Team Matching Algorithm

CampusOne uses a weighted heuristic model to calculate compatibility between students and project requirements.

| Matching Factor | Weight |
|---|---:|
| Technical Skills | 40% |
| Interests | 20% |
| Goals | 15% |
| Availability | 15% |
| Project Experience | 10% |

The resulting compatibility score is capped at 97%.

These scores are indicative estimates intended to support team formation rather than objectively measure individual capabilities.

## Reliability and Error Handling

The application incorporates fallback mechanisms to maintain usability when external AI services are unavailable.

- Graceful handling of API errors, timeouts, and rate limits.
- Manual event entry when AI processing fails.
- Local tag-based recommendation fallback.
- Local team compatibility explanations.
- Retry functionality for AI-powered question answering.
- Validation of AI-generated structured responses.

## Authentication and Security

Google authentication is implemented using Passport.js and `passport-google-oauth20`.

- OAuth credentials remain server-side.
- Express sessions manage authenticated users.
- HTTP-only cookies are used for session handling.
- API keys are configured through environment variables.
- Demo authentication is restricted in production.

## Getting Started

### Prerequisites

- Node.js
- npm
- Anthropic API key
- Google OAuth credentials (optional)

### Installation

**1. Clone the repository**

```bash
git clone YOUR_REPOSITORY_URL
cd CampusOne
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback

SESSION_SECRET=your_session_secret
```

**4. Start the development environment**

```bash
npm run dev
```

Development URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

**5. Build for production**

```bash
npm run build
npm start
```

The production application runs at:

`http://localhost:3001`

## Project Structure

```text
CampusOne/
|
|-- server/
|   |-- server.js
|   |-- auth.js
|   |
|   |-- routes/
|   |   |-- ai.js
|   |   |-- team.js
|   |
|   |-- services/
|   |   |-- claudeService.js
|   |   |-- localMatch.js
|   |   |-- teamMatch.js
|   |
|   |-- data/
|       |-- seed.js
|       |-- store.js
|       |-- users.js
|       |-- students.js
|
|-- src/
|   |-- App.jsx
|   |
|   |-- pages/
|   |-- components/
|   |-- lib/
|   |
|   |-- services/
|       |-- api.js
|
|-- .env.example
|-- package.json
|-- README.md
```

## Demo Workflow

The primary application workflow includes:

1. Explore the campus dashboard and personalised recommendations.
2. Discover hackathons, workshops, internships, and competitions.
3. Convert an unstructured announcement into a structured event using AI Organise.
4. Ask questions about available opportunities through Ask Campus.
5. Explore registration deadlines.
6. Analyse project requirements through AI Team Builder.
7. Review team compatibility and manage invitations.

The application includes eight fictional demonstration student profiles for showcasing team-matching functionality.

## Future Scope

- Integration with additional institutional information sources.
- Persistent database infrastructure.
- Real-time notifications and deadline reminders.
- Multi-institution support.
- Improved recommendation and matching algorithms.
- Dedicated mobile application.

## Project Information

**Project:** CampusOne  
**Category:** AI-Powered Full-Stack Web Application  
**AI Provider:** Anthropic Claude  
**Deployment:** Render  

**Live Application:** https://hacktoberfest-bhopal-campusone-1.onrender.com/

---

*Centralising campus opportunities through intelligent information processing and collaborative discovery.*
