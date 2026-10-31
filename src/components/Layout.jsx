import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigationType } from 'react-router-dom';
import {
  Home, Compass, AlarmClock, Sparkles, Settings2, Menu, X, Handshake, UserRound, LogOut, UsersRound, Search, ChevronDown,
} from 'lucide-react';
import { Logo } from './ui.jsx';
import { Avatar, GoogleIcon } from './auth.jsx';
import CommandPalette from './CommandPalette.jsx';
import { useApp } from '../lib/AppContext.jsx';
import { daysUntil } from '../lib/dates.js';
import { scrollPageTo, useScrollLock } from '../lib/scrollLock.js';
import { NAV, MORE_NAV } from '../lib/nav.js';

const ACCOUNT_NAV = [
  { to: '/profile', label: 'My Profile', icon: UserRound },
  { to: '/team/mine', label: 'My Team', icon: UsersRound },
  { to: '/preferences', label: 'Preferences', icon: Settings2 },
];

function useUrgentCount() {
  const { events } = useApp();
  return events.filter((e) => {
    const n = daysUntil(e.registrationDeadline);
    return n !== null && n >= 0 && n <= 3;
  }).length;
}

/** Click-outside / Escape dropdown. */
function Popover({ button, children, align = 'right', label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {button({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div role="menu" aria-label={label} className={`absolute top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl animate-scale-in ${align === 'right' ? 'right-0' : 'left-0'}`} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, icon: Icon, label, hint }) {
  return (
    <Link to={to} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="min-w-0 flex-1"><span className="block font-medium">{label}</span>{hint && <span className="block truncate text-xs text-slate-400">{hint}</span>}</span>
    </Link>
  );
}

function DesktopNav({ urgent }) {
  const { pathname } = useLocation();
  const moreActive = MORE_NAV.some((m) => pathname.startsWith(m.to));
  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}
          className={({ isActive }) => `relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
          {({ isActive }) => (
            <>
              {item.label}
              {item.badge && urgent > 0 && <span className="rounded-full bg-red-500/10 px-1.5 text-[10px] font-bold leading-4 text-red-600">{urgent}</span>}
              {isActive && <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-slate-900" aria-hidden />}
            </>
          )}
        </NavLink>
      ))}
      <Popover label="More" align="left" button={({ open, toggle }) => (
        <button onClick={toggle} aria-expanded={open} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition-colors ${moreActive || open ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
          More <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}>
        {MORE_NAV.map((m) => <MenuLink key={m.to} {...m} />)}
      </Popover>
    </nav>
  );
}

function AccountButton() {
  const { user, authLoading, requireAuth, signOut } = useApp();
  if (authLoading) return <div className="h-8 w-8 rounded-full skeleton" />;
  if (!user) {
    return (
      <button onClick={() => requireAuth(null)} className="flex items-center gap-2 rounded-full bg-slate-900 py-1.5 pl-2 pr-3.5 text-[13px] font-semibold text-white transition hover:bg-black">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white"><GoogleIcon className="h-3.5 w-3.5" /></span>
        Sign in
      </button>
    );
  }
  return (
    <Popover label="Account" button={({ open, toggle }) => (
      <button onClick={toggle} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-4 hover:ring-slate-200/70">
        <Avatar name={user.name} src={user.picture} size={32} className="!ring-0" />
      </button>
    )}>
      <div className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5">
        <Avatar name={user.name} src={user.picture} size={36} className="!ring-0" />
        <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{user.name}</div><div className="truncate text-xs text-slate-400">{(user.skills || []).slice(0, 3).join(' · ') || 'CampusOne student'}</div></div>
      </div>
      <div className="mx-2 mb-1 h-px bg-slate-100" />
      {ACCOUNT_NAV.map((m) => <MenuLink key={m.to} {...m} />)}
      <button onClick={signOut} role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"><LogOut className="h-4 w-4 text-slate-400" />Sign out</button>
    </Popover>
  );
}

function MobileSheet({ open, onClose, urgent }) {
  const { user, requireAuth, signOut } = useApp();
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const Item = ({ to, icon: Icon, label, end, badge }) => (
    <NavLink to={to} end={end} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}>
      <Icon className="h-[18px] w-[18px] text-slate-400" /><span className="flex-1">{label}</span>
      {badge && urgent > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white">{urgent}</span>}
    </NavLink>
  );
  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col bg-white shadow-2xl animate-sheet-in">
        <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <Logo />
          <button onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overlay-scroll flex-1 px-3 py-4">
          <nav className="space-y-0.5" aria-label="Main">{NAV.map((i) => <Item key={i.to} {...i} />)}</nav>
          <p className="eyebrow mb-2 mt-6 px-3">More</p>
          <nav className="space-y-0.5" aria-label="More">{MORE_NAV.map((i) => <Item key={i.to} {...i} />)}</nav>
          {user && (
            <>
              <p className="eyebrow mb-2 mt-6 px-3">You</p>
              <nav className="space-y-0.5" aria-label="Account">{ACCOUNT_NAV.map((i) => <Item key={i.to} {...i} />)}</nav>
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.picture} size={38} className="!ring-0" />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-xs text-slate-400">Signed in</div></div>
              <button onClick={() => { onClose(); signOut(); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Sign out</button>
            </div>
          ) : (
            <button onClick={() => { onClose(); requireAuth(null); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white"><GoogleIcon className="h-3.5 w-3.5" /></span>Continue with Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const MOBILE_TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/ask', label: 'Ask', icon: Sparkles, primary: true },
  { to: '/team', label: 'Team', icon: Handshake },
  { to: '/deadlines', label: 'Deadlines', icon: AlarmClock },
];

/** Scroll to top on new pages, restore position on Back/Forward. */
function useScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map());
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const save = () => positions.current.set(window.history.state?.key || location.key, window.scrollY);
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(save); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [location.key]);
  useLayoutEffect(() => {
    const pathChanged = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    if (navType === 'POP') {
      const y = positions.current.get(location.key);
      if (y != null) {
        // Content can still be laying out; retry for a few frames until the page is tall enough.
        let tries = 0;
        const step = () => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          scrollPageTo(Math.min(y, Math.max(0, max)));
          if (max < y && tries++ < 40) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        return;
      }
    }
    if (pathChanged || navType === 'POP') scrollPageTo(0);
  }, [location.key, location.pathname, navType]);
}

export default function Layout({ children }) {
  const [sheet, setSheet] = useState(false);
  const [palette, setPalette] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const urgent = useUrgentCount();
  useScrollRestoration();
  useEffect(() => { setSheet(false); }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) { e.preventDefault(); setPalette(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-lg">Skip to content</a>
      <header className={`sticky top-0 z-40 h-[var(--header-h)] border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${scrolled ? 'border-slate-200/70 bg-paper/75 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-paper'}`}>
        <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="CampusOne home" className="shrink-0"><Logo /></Link>
          <div className="mx-auto"><DesktopNav urgent={urgent} /></div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button onClick={() => setPalette(true)} aria-label="Search CampusOne" className="flex h-9 items-center gap-2 rounded-xl text-slate-500 transition hover:text-slate-900 max-lg:w-9 max-lg:justify-center lg:w-52 lg:border lg:border-slate-200/80 lg:bg-white lg:px-3 lg:text-[13px] lg:hover:border-slate-300">
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 text-left lg:inline">Search campus…</span>
              <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 font-sans text-[10px] font-semibold text-slate-400 lg:inline">Ctrl K</kbd>
            </button>
            <div className="hidden lg:block"><AccountButton /></div>
            <button onClick={() => setSheet(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileSheet open={sheet} onClose={() => setSheet(false)} urgent={urgent} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />

      <main id="main" key={location.pathname} className="min-w-0 flex-1 px-4 pb-[calc(var(--bottomnav-h)+32px)] pt-6 animate-fade-in sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 h-[var(--bottomnav-h)] border-t border-slate-200/70 bg-paper/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around">
          {MOBILE_TABS.map(({ to, label, icon: Icon, end, primary }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[10.5px] font-medium ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
              {({ isActive }) => (
                <>
                  {primary ? (
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${isActive ? 'bg-indigo-600' : 'bg-slate-900'} text-white`}><Icon className="h-[18px] w-[18px]" /></span>
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                  )}
                  {!primary && label}
                  {to === '/deadlines' && urgent > 0 && <span className="absolute right-[calc(50%-18px)] top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-paper" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
