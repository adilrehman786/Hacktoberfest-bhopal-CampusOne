// CampusOne authentication: Google OAuth 2.0 via Passport + express-session.
// The Google client secret only exists on the server (env vars). Google access
// tokens are never stored or sent to the browser; we keep only the profile basics.
import crypto from 'node:crypto';
import { Router } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getUser, upsertGoogleUser, updateProfile, privateProfile, OPTIONS } from './data/users.js';

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5173/api/auth/google/callback';
const IS_PROD = process.env.NODE_ENV === 'production';

export const googleConfigured = () => Boolean(GOOGLE_ID && GOOGLE_SECRET);
// Local-only "demo student" sign-in so the app can be tested before Google
// credentials exist. Disabled in production or with ALLOW_DEMO_LOGIN=off.
export const demoLoginEnabled = () => !IS_PROD && process.env.ALLOW_DEMO_LOGIN !== 'off';

let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('  [auth] SESSION_SECRET not set: using a random one (sessions reset on restart).');
}

if (googleConfigured()) {
  passport.use(new GoogleStrategy(
    { clientID: GOOGLE_ID, clientSecret: GOOGLE_SECRET, callbackURL: CALLBACK_URL, scope: ['profile', 'email'], state: true },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.find((e) => e.verified !== false)?.value || profile.emails?.[0]?.value || '';
        const user = upsertGoogleUser({
          googleId: profile.id,
          email,
          name: profile.displayName || profile.name?.givenName || 'Student',
          picture: profile.photos?.[0]?.value || null,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, getUser(id) || false));

/** Mount session + passport middleware on the app. */
export function setupAuth(app) {
  if (IS_PROD) app.set('trust proxy', 1);
  app.use(session({
    name: 'campusone.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 1000 * 60 * 60 * 24 * 14 },
  }));
  app.use(passport.initialize());
  app.use(passport.session());
}

export function requireUser(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: 'Sign in to use this feature.', code: 'auth_required' });
}

// Only allow same-site relative redirects after login.
const safeReturn = (p) => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/api') ? p : '/');

const router = Router();

router.get('/me', (req, res) => {
  res.json({
    user: privateProfile(req.user),
    providers: { google: googleConfigured(), demo: demoLoginEnabled() },
    options: OPTIONS,
  });
});

router.get('/google', (req, res, next) => {
  if (!googleConfigured()) return res.redirect('/?auth=unconfigured');
  req.session.returnTo = safeReturn(req.query.returnTo);
  passport.authenticate('google', { prompt: 'select_account' })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleConfigured()) return res.redirect('/?auth=unconfigured');
  passport.authenticate('google', (err, user) => {
    if (err || !user) {
      if (err) console.warn('[auth] Google sign-in failed:', err.message);
      return res.redirect('/?auth=failed');
    }
    const returnTo = safeReturn(req.session.returnTo); // read before login regenerates the session
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.redirect(user.onboarded ? returnTo : `/onboarding?next=${encodeURIComponent(returnTo)}`);
    });
  })(req, res, next);
});

router.post('/demo', (req, res, next) => {
  if (!demoLoginEnabled()) return res.status(404).json({ error: 'Not found' });
  const user = upsertGoogleUser({ googleId: 'local-demo-student', email: 'demo.student@campusone.local', name: 'Demo Student', picture: null });
  req.logIn(user, (err) => (err ? next(err) : res.json({ user: privateProfile(user) })));
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('campusone.sid');
      res.json({ ok: true });
    });
  });
});

router.put('/profile', requireUser, (req, res) => {
  res.json({ user: privateProfile(updateProfile(req.user.id, req.body || {})) });
});

export default router;
