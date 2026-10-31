import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

const AppContext = createContext(null);

const DEFAULT_PREFS = {
  name: 'Student',
  year: '2nd year',
  interests: ['AI / ML', 'Web Development'],
  goals: ['Win hackathons', 'Build projects', 'Learn skills'],
};

function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/blocked */ }
  }, [key, value]);
  return [value, setValue];
}

export function AppProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [localPrefs, setLocalPrefs] = useLocalState('campusone.prefs', DEFAULT_PREFS);
  const [auth, setAuth] = useState({ loading: true, user: null, providers: { google: false, demo: false }, options: null });
  const [authPrompt, setAuthPrompt] = useState(null); // { reason, returnTo, then }
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = auth.user;
  // Event details is a modal: close it whenever the page changes.
  useEffect(() => { setSelectedId(null); }, [pathname]);
  // Signed-in students: preferences come from their CampusOne profile.
  const preferences = useMemo(() => (user
    ? { name: user.name || 'Student', year: user.year || localPrefs.year, interests: user.interests || [], goals: user.goals || [] }
    : localPrefs), [user, localPrefs]);
  const [registered, setRegistered] = useLocalState('campusone.registered', []);
  const [selectedId, setSelectedId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [recs, setRecs] = useState({ loading: true, items: [], source: null });
  const recsKey = useRef('');
  const returnToRef = useRef(null); // where to go after onboarding (demo sign-in)

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { events } = await api.events();
      setEvents(events);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ---- Auth -------------------------------------------------------------
  const refreshUser = useCallback(async () => {
    try {
      const data = await api.me();
      setAuth({ loading: false, user: data.user, providers: data.providers, options: data.options });
      return data.user;
    } catch {
      setAuth((a) => ({ ...a, loading: false }));
      return null;
    }
  }, []);
  useEffect(() => { refreshUser(); }, [refreshUser]);

  const setUser = useCallback((u) => setAuth((a) => ({ ...a, user: u })), []);

  const signIn = useCallback(async (returnTo = window.location.pathname + window.location.search) => {
    if (auth.providers.google) {
      window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }
    throw new Error("Google sign-in isn't configured on this server yet.");
  }, [auth.providers.google]);

  const demoSignIn = useCallback(async () => {
    const { user: u } = await api.demoLogin();
    const pending = authPrompt;
    setAuthPrompt(null);
    // New students are redirected to onboarding by <AuthEffects>; tell it where to go afterwards.
    returnToRef.current = pending?.returnTo || null;
    setUser(u);
    if (u.onboarded && pending?.then) pending.then();
    return u;
  }, [setUser, authPrompt]);

  // Read-only (safe during render); cleared on sign-out.
  const takeReturnTo = useCallback(() => returnToRef.current, []);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* already signed out */ }
    returnToRef.current = null;
    try { sessionStorage.removeItem('campusone.teambuilder'); } catch { /* storage blocked */ }
    setUser(null);
    navigate('/');
  }, [setUser, navigate]);

  const saveProfile = useCallback(async (profile) => {
    const { user: u } = await api.updateProfile(profile);
    setUser(u);
    return u;
  }, [setUser]);

  /** Run `fn` if signed in; otherwise show the "Join CampusOne" modal. */
  const requireAuth = useCallback((fn, opts = {}) => {
    if (user) { fn?.(); return true; }
    setAuthPrompt({ reason: opts.reason, returnTo: opts.returnTo || window.location.pathname + window.location.search, then: fn });
    return false;
  }, [user]);

  const setPreferences = useCallback((next) => {
    const value = typeof next === 'function' ? next(preferences) : next;
    if (!user) return setLocalPrefs(value);
    setLocalPrefs((p) => ({ ...p, year: value.year }));
    return saveProfile({ name: value.name, year: value.year, interests: value.interests, goals: value.goals }).catch(() => toast('Could not save your profile. Try again.', 'error'));
  }, [user, preferences, setLocalPrefs, saveProfile, toast]);

  const loadRecommendations = useCallback(async (force = false) => {
    const key = JSON.stringify([preferences.interests, preferences.goals, events.length]);
    if (!force && key === recsKey.current) return;
    recsKey.current = key;
    setRecs((r) => ({ ...r, loading: true }));
    try {
      const data = await api.recommend(preferences);
      if (recsKey.current === key) setRecs({ loading: false, items: data.recommendations, source: data.source });
    } catch {
      if (recsKey.current === key) setRecs({ loading: false, items: [], source: 'error' });
    }
  }, [preferences, events.length]);

  // Personalised recommendations are a signed-in feature.
  useEffect(() => {
    if (events.length && user?.onboarded) loadRecommendations();
  }, [events.length, user?.onboarded, loadRecommendations]);

  const addEvent = useCallback(async (event) => {
    const { event: saved } = await api.addEvent(event);
    setEvents((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const toggleRegister = useCallback((id) => {
    if (!user) {
      requireAuth(null, { reason: 'Sign in to save opportunities and track your deadlines.' });
      return;
    }
    const isReg = registered.includes(id);
    toast(isReg ? 'Removed from your plan' : "You're registered! We'll remind you before it starts.", isReg ? 'info' : 'success');
    setRegistered((prev) => (isReg ? prev.filter((x) => x !== id) : [...prev, id]));
  }, [registered, setRegistered, toast, user, requireAuth]);

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const recById = useMemo(() => new Map(recs.items.map((r) => [r.id, r])), [recs.items]);
  // Signed-in profile used for match explanations (null for guests).
  const profile = useMemo(() => (user ? { interests: user.interests || [], goals: user.goals || [], skills: user.skills || [], availability: user.availability || [] } : null), [user]);

  const value = {
    events, eventsById, loading, loadError, reloadEvents: loadEvents, addEvent,
    preferences, setPreferences,
    user, authLoading: auth.loading, providers: auth.providers, options: auth.options,
    signIn, demoSignIn, signOut, takeReturnTo, saveProfile, refreshUser, requireAuth,
    authPrompt, closeAuthPrompt: () => setAuthPrompt(null),
    registered, toggleRegister,
    selectedEvent: selectedId ? eventsById.get(selectedId) : null,
    openEvent: setSelectedId,
    closeEvent: () => setSelectedId(null),
    recs, recById, loadRecommendations, profile,
    toasts, toast,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
