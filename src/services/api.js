// All network calls go to our own backend. The browser never talks to Anthropic.
async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the CampusOne server. Is it running?'), { code: 'network' });
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { code: data.code, status: res.status });
  return data;
}

export const api = {
  events: () => request('/events'),
  addEvent: (event) => request('/events', { method: 'POST', body: event }),
  organise: (text) => request('/ai/organise', { method: 'POST', body: { text } }),
  ask: (question, history, preferences) => request('/ai/ask', { method: 'POST', body: { question, history, preferences } }),
  recommend: (preferences) => request('/ai/recommend', { method: 'POST', body: { preferences } }),
  summarise: (preferences) => request('/ai/summarise', { method: 'POST', body: { preferences } }),
  briefing: (preferences) => request('/ai/briefing', { method: 'POST', body: { preferences } }),
  health: () => request('/health'),

  // Auth + profile
  me: () => request('/auth/me'),
  demoLogin: () => request('/auth/demo', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (profile) => request('/auth/profile', { method: 'PUT', body: profile }),

  // AI Team Builder
  analyseTeam: (description, eventId) => request('/team/analyse', { method: 'POST', body: { description, eventId } }),
  teamCompatibility: (analysis, memberIds, eventId) => request('/team/compatibility', { method: 'POST', body: { analysis, memberIds, eventId } }),
  invite: (team, studentId, role) => request('/team/invite', { method: 'POST', body: { team, studentId, role } }),
  updateTeam: (id, team) => request(`/team/${encodeURIComponent(id)}`, { method: 'PUT', body: team }),
  deleteTeam: (id) => request(`/team/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  myTeams: () => request('/team/mine'),
  respondInvite: (id, accept) => request(`/team/invitations/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { accept } }),
  student: (id) => request(`/team/students/${encodeURIComponent(id)}`),

  // Streams a Campus Buddy reply. Calls onText(chunk) as text arrives.
  async chatStream(messages, preferences, onText, signal) {
    let res;
    try {
      res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, preferences }),
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new Error('Cannot reach the CampusOne server. Is it running?');
    }
    if (!res.ok || !res.body) {
      let data = {};
      try { data = await res.json(); } catch { /* ignore */ }
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const data = JSON.parse(line.slice(6));
        if (data.error) throw new Error(data.error);
        if (data.text) onText(data.text);
      }
    }
  },
};
