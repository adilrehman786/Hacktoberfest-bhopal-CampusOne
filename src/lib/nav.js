import { Home, Compass, Briefcase, Users, AlarmClock, MessageCircle, Wand2, Handshake } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/team', label: 'Team Builder', icon: Handshake, end: true },
  { to: '/deadlines', label: 'Deadlines', icon: AlarmClock, badge: true },
  { to: '/ask', label: 'Ask Campus', icon: MessageCircle },
];
export const MORE_NAV = [
  { to: '/opportunities', label: 'Opportunities', icon: Briefcase, hint: 'Internships & scholarships' },
  { to: '/clubs', label: 'Clubs', icon: Users, hint: 'Communities & meetups' },
  { to: '/organise', label: 'AI Organise', icon: Wand2, hint: 'Turn an announcement into an event' },
];
