import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import EventDetails from './components/EventDetails.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import { Toasts } from './components/ui.jsx';
import { AuthModal, RequireAuth } from './components/auth.jsx';
import { useApp } from './lib/AppContext.jsx';
import Home from './pages/Home.jsx';
import Discover from './pages/Discover.jsx';
import Deadlines from './pages/Deadlines.jsx';
import AskCampus from './pages/AskCampus.jsx';
import Organise from './pages/Organise.jsx';
import Preferences from './pages/Preferences.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Profile from './pages/Profile.jsx';
import TeamBuilder from './pages/TeamBuilder.jsx';
import MyTeam from './pages/MyTeam.jsx';

// Sends new students to onboarding, and surfaces OAuth errors from the redirect.
function AuthEffects() {
  const { user, toast, takeReturnTo } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const auth = params.get('auth');
    if (!auth) return;
    toast(auth === 'unconfigured' ? "Google sign-in isn't configured on this server yet." : 'Google sign-in failed. Please try again.', 'error');
    params.delete('auth');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.search, location.pathname, navigate, toast]);
  if (user && !user.onboarded && !['/onboarding', '/login'].includes(location.pathname)) {
    return <Navigate to={`/onboarding?next=${encodeURIComponent(takeReturnTo() || location.pathname + location.search)}`} replace />;
  }
  return null;
}

export default function App() {
  return (
    <>
      <AuthEffects />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover key="discover" />} />
          <Route
            path="/opportunities"
            element={<Discover key="opps" title="Opportunities" subtitle="Internships, scholarships and fellowships that move your career forward." categories={['Internship', 'Scholarship']} />}
          />
          <Route
            path="/clubs"
            element={<Discover key="clubs" title="Clubs & communities" subtitle="Find your people: meetups, orientations and club activities." categories={['Club']} />}
          />
          <Route path="/deadlines" element={<Deadlines />} />
          <Route path="/ask" element={<AskCampus />} />
          <Route path="/organise" element={<Organise />} />
          <Route path="/team" element={<TeamBuilder />} />
          <Route path="/team/mine" element={<MyTeam />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/preferences" element={<RequireAuth title="Personalise CampusOne" text="Sign in to save your interests and goals and get personalised recommendations."><Preferences /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <EventDetails />
      <ChatWidget />
      <AuthModal />
      <Toasts />
    </>
  );
}
