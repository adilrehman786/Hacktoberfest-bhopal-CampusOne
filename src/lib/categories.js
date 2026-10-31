import { Trophy, CalendarDays, Wrench, Swords, Users, Briefcase, GraduationCap, Megaphone, Mic, Sparkles } from 'lucide-react';

// Visual identity per category. Classes are full strings so Tailwind can see them.
export const CATEGORIES = {
  Hackathon: { label: 'Hackathons', icon: Trophy, chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', tile: 'from-indigo-500 to-indigo-600', soft: 'bg-indigo-50 text-indigo-600' },
  Event: { label: 'Events', icon: CalendarDays, chip: 'bg-sky-50 text-sky-700 ring-sky-200', tile: 'from-sky-500 to-sky-600', soft: 'bg-sky-50 text-sky-600' },
  Workshop: { label: 'Workshops', icon: Wrench, chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', tile: 'from-emerald-500 to-emerald-600', soft: 'bg-emerald-50 text-emerald-600' },
  Competition: { label: 'Competitions', icon: Swords, chip: 'bg-rose-50 text-rose-700 ring-rose-200', tile: 'from-rose-500 to-rose-600', soft: 'bg-rose-50 text-rose-600' },
  Club: { label: 'Clubs', icon: Users, chip: 'bg-amber-50 text-amber-700 ring-amber-200', tile: 'from-amber-500 to-orange-500', soft: 'bg-amber-50 text-amber-600' },
  Internship: { label: 'Internships', icon: Briefcase, chip: 'bg-violet-50 text-violet-700 ring-violet-200', tile: 'from-violet-500 to-violet-600', soft: 'bg-violet-50 text-violet-600' },
  Scholarship: { label: 'Scholarships', icon: GraduationCap, chip: 'bg-teal-50 text-teal-700 ring-teal-200', tile: 'from-teal-500 to-teal-600', soft: 'bg-teal-50 text-teal-600' },
  Announcement: { label: 'Announcements', icon: Megaphone, chip: 'bg-slate-100 text-slate-700 ring-slate-200', tile: 'from-slate-500 to-slate-600', soft: 'bg-slate-100 text-slate-600' },
  Seminar: { label: 'Seminars', icon: Mic, chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', tile: 'from-fuchsia-500 to-fuchsia-600', soft: 'bg-fuchsia-50 text-fuchsia-600' },
};

export const catMeta = (c) => CATEGORIES[c] || { label: c, icon: Sparkles, chip: 'bg-slate-100 text-slate-700 ring-slate-200', tile: 'from-slate-500 to-slate-600', soft: 'bg-slate-100 text-slate-600' };

export const INTERESTS = ['AI / ML', 'Web Development', 'App Development', 'Data Science', 'Cybersecurity', 'Cloud', 'UI/UX', 'Entrepreneurship', 'Competitive Programming', 'Open Source'];
export const GOALS = ['Win hackathons', 'Build projects', 'Find internships', 'Learn new skills', 'Join clubs', 'Meet other students', 'Build a portfolio', 'Get scholarships'];
export const AVAILABILITY = ['Weekdays', 'Weekends', 'Evenings', 'Flexible'];
export const SKILL_SUGGESTIONS = ['Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Machine Learning', 'Figma', 'UI/UX', 'Flutter', 'Kotlin', 'C++', 'Data Analysis', 'AWS', 'Docker', 'MongoDB', 'Pitching'];
