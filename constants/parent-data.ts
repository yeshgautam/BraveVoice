export const PARENT_NAME = 'Jamie';
export const PARENT_EMAIL = 'jamie.rivera@email.com';

export const CHILD = {
  name: 'Alex',
  initials: 'A',
  age: 7,
  mode: 'Little Voices',
  lastActiveLabel: 'Practiced 2 hours ago',
  streakDays: 7,
};

export const SUMMARY_CARDS = [
  { key: 'fluency', value: '84%', label: 'Fluency score', accent: '📈' },
  { key: 'streak', value: '7 Days', label: 'Current streak', accent: '🔥' },
  { key: 'xp', value: '320 XP', label: 'Earned this week', accent: '⭐' },
  { key: 'homework', value: '3/3', label: 'Homework done', accent: '✅' },
];

export type HomeworkStatus = {
  key: string;
  strategy: string;
  icon: string;
  gameName: string;
  completed: boolean;
  fluencyScore: number | null;
  timeSpent: string | null;
  dateLabel: string;
};

export const TODAYS_HOMEWORK: HomeworkStatus[] = [
  {
    key: 'hw1',
    strategy: 'Easy Onset',
    icon: '🌬️',
    gameName: 'Bubble Pop',
    completed: true,
    fluencyScore: 88,
    timeSpent: '4 minutes',
    dateLabel: 'Completed',
  },
  {
    key: 'hw2',
    strategy: 'Slow Speech',
    icon: '🐢',
    gameName: 'Glacier Glide',
    completed: true,
    fluencyScore: 76,
    timeSpent: '3 minutes',
    dateLabel: 'Completed',
  },
  {
    key: 'hw3',
    strategy: 'Stretchy Speech',
    icon: '🎈',
    gameName: 'Rainbow Stretch',
    completed: false,
    fluencyScore: null,
    timeSpent: null,
    dateLabel: 'Due today',
  },
];

export type DayStatus = 'practiced' | 'today' | 'upcoming';

export const WEEKLY_CALENDAR: { label: string; status: DayStatus }[] = [
  { label: 'Mon', status: 'practiced' },
  { label: 'Tue', status: 'practiced' },
  { label: 'Wed', status: 'practiced' },
  { label: 'Thu', status: 'practiced' },
  { label: 'Fri', status: 'today' },
  { label: 'Sat', status: 'upcoming' },
  { label: 'Sun', status: 'upcoming' },
];

export const FLUENCY_TREND = [65, 71, 78, 84];
export const FLUENCY_TARGET = [80, 80, 80, 80];
export const FLUENCY_TREND_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

export type StrategyBreakdown = {
  key: string;
  name: string;
  emoji: string;
  score: number;
  sessions: number;
  bestGame: string;
};

export const STRATEGY_BREAKDOWN: StrategyBreakdown[] = [
  { key: 'easy-onset', name: 'Easy Onset', emoji: '🌬️', score: 88, sessions: 12, bestGame: 'Bubble Pop' },
  { key: 'slow-speech', name: 'Slow Speech', emoji: '🐌', score: 76, sessions: 8, bestGame: 'Glacier Glide' },
  { key: 'stretchy-speech', name: 'Stretchy Speech', emoji: '〰️', score: 71, sessions: 6, bestGame: 'Rainbow Stretch' },
  { key: 'light-contact', name: 'Light Contact', emoji: '🪶', score: 79, sessions: 4, bestGame: 'Feather Touch' },
  { key: 'cancellations', name: 'Cancellations', emoji: '🔁', score: 65, sessions: 3, bestGame: 'Ice Rebuild' },
];

export type AchievementBadge = {
  key: string;
  emoji: string;
  name: string;
  earned: boolean;
  dateEarned: string | null;
};

export const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  { key: 'first-strike', emoji: '🎯', name: 'First Strike', earned: true, dateEarned: 'June 2' },
  { key: 'on-fire', emoji: '🔥', name: 'On Fire', earned: true, dateEarned: 'June 8' },
  { key: 'triple-star', emoji: '⭐', name: 'Triple Star', earned: true, dateEarned: 'June 10' },
  { key: 'easy-onset-master', emoji: '🏆', name: 'Easy Onset Master', earned: true, dateEarned: 'June 12' },
  { key: 'smooth-talker', emoji: '🌊', name: 'Smooth Talker', earned: false, dateEarned: null },
  { key: 'ice-legend', emoji: '🧊', name: 'Ice Legend', earned: false, dateEarned: null },
];

export const ENCOURAGEMENT_INSIGHTS = [
  { key: 'lowest', emoji: '🎯', text: 'Keep practicing Cancellations — lowest score at 65%' },
  { key: 'inactive', emoji: '📅', text: `${CHILD.name} hasn't practiced Stretchy Speech in 5 days` },
];

export const THERAPIST_INFO = {
  name: 'Dr. Sarah Johnson',
  role: 'Speech Language Pathologist',
  initials: 'SJ',
  classCode: 'ABC123',
};

export type Session = {
  key: string;
  dateLabel: string;
  type: 'In Person' | 'Virtual';
  location: string;
};

export const UPCOMING_SESSIONS: Session[] = [
  { key: 'session1', dateLabel: 'Thursday, June 5 at 3:30pm', type: 'In Person', location: 'Eden Prairie Speech Clinic' },
  { key: 'session2', dateLabel: 'Thursday, June 12 at 3:30pm', type: 'In Person', location: 'Eden Prairie Speech Clinic' },
];

export type AssignedHomework = {
  key: string;
  strategy: string;
  gameName: string;
  assignedLabel: string;
  completed: boolean;
};

export const RECENT_HOMEWORK_ASSIGNED: AssignedHomework[] = [
  { key: 'a1', strategy: 'Easy Onset', gameName: 'Bubble Pop', assignedLabel: 'Assigned Monday', completed: true },
  { key: 'a2', strategy: 'Slow Speech', gameName: 'Glacier Glide', assignedLabel: 'Assigned Monday', completed: true },
  { key: 'a3', strategy: 'Stretchy Speech', gameName: 'Rainbow Stretch', assignedLabel: 'Assigned Monday', completed: false },
];

export const THERAPIST_NOTE = {
  text: `${CHILD.name} is making great progress with Easy Onset this week! Keep encouraging daily practice especially with Stretchy Speech which we started working on Thursday.`,
  author: 'Dr. Johnson',
  dateLabel: 'June 8',
};
