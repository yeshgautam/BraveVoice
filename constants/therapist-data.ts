export type StudentMode = 'Little Voices' | 'Big Voices';

export type Student = {
  id: string;
  name: string;
  initials: string;
  age: number;
  mode: StudentMode;
  lastActive: string;
  fluencyScore: number;
  needsAttention?: boolean;
};

export const STUDENTS: Student[] = [
  {
    id: 'alex-l',
    name: 'Alex L.',
    initials: 'AL',
    age: 7,
    mode: 'Little Voices',
    lastActive: 'Active 2 hours ago',
    fluencyScore: 84,
  },
  {
    id: 'sam-k',
    name: 'Sam K.',
    initials: 'SK',
    age: 9,
    mode: 'Big Voices',
    lastActive: 'Active yesterday',
    fluencyScore: 71,
  },
  {
    id: 'jordan-m',
    name: 'Jordan M.',
    initials: 'JM',
    age: 6,
    mode: 'Little Voices',
    lastActive: 'Active 3 days ago',
    fluencyScore: 62,
  },
  {
    id: 'casey-r',
    name: 'Casey R.',
    initials: 'CR',
    age: 11,
    mode: 'Big Voices',
    lastActive: 'Active today',
    fluencyScore: 91,
  },
  {
    id: 'riley-t',
    name: 'Riley T.',
    initials: 'RT',
    age: 5,
    mode: 'Little Voices',
    lastActive: 'Active 1 week ago',
    fluencyScore: 45,
    needsAttention: true,
  },
];

export function getStudent(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id);
}

export type HomeworkItem = {
  key: string;
  strategy: string;
  gameName: string;
  completed: boolean;
  fluencyScore: number | null;
  dateLabel: string;
};

export const HOMEWORK_BY_STUDENT: Record<string, HomeworkItem[]> = {
  'alex-l': [
    { key: 'hw1', strategy: 'Easy Onset', gameName: 'Bubble Pop', completed: true, fluencyScore: 88, dateLabel: 'Monday' },
    { key: 'hw2', strategy: 'Slow Speech', gameName: 'Glacier Glide', completed: true, fluencyScore: 76, dateLabel: 'Tuesday' },
    { key: 'hw3', strategy: 'Stretchy Speech', gameName: 'Rainbow Stretch', completed: false, fluencyScore: null, dateLabel: 'Due today' },
  ],
};

const DEFAULT_HOMEWORK: HomeworkItem[] = [
  { key: 'hw1', strategy: 'Easy Onset', gameName: 'Bubble Pop', completed: true, fluencyScore: 80, dateLabel: 'Monday' },
  { key: 'hw2', strategy: 'Slow Speech', gameName: 'Glacier Glide', completed: false, fluencyScore: null, dateLabel: 'Due today' },
];

export function getHomework(studentId: string): HomeworkItem[] {
  return HOMEWORK_BY_STUDENT[studentId] ?? DEFAULT_HOMEWORK;
}

export type PhonemeScore = {
  phoneme: string;
  score: number;
};

export const PHONEME_BREAKDOWN: PhonemeScore[] = [
  { phoneme: '/b/', score: 92 },
  { phoneme: '/p/', score: 88 },
  { phoneme: '/m/', score: 95 },
  { phoneme: '/s/', score: 61 },
  { phoneme: '/r/', score: 54 },
  { phoneme: '/l/', score: 71 },
];

export const PRIORITY_PHONEMES = ['/s/', '/r/'];

export type FluencyTechnique = {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

export const FLUENCY_SHAPING_TECHNIQUES: FluencyTechnique[] = [
  { key: 'easy-onset', name: 'Easy Onset', description: 'Start every word with a smooth, gentle attack', icon: '🌬️', color: '#1A6FA8' },
  { key: 'slow-speech', name: 'Slow Speech', description: 'Slow, deliberate speech for total control', icon: '🐢', color: '#3BA776' },
  { key: 'stretchy-speech', name: 'Stretchy Speech', description: 'Stretch words out long and smooth', icon: '🎈', color: '#F5C842' },
];

export const STUTTERING_MODIFICATION_TECHNIQUES: FluencyTechnique[] = [
  { key: 'cancellations', name: 'Cancellations', description: 'Stumble, pause, and restart smoothly', icon: '🔁', color: '#E8724A' },
  { key: 'light-contact', name: 'Light Contact', description: 'Keep articulation light and easy', icon: '🪶', color: '#E8724A' },
];

export const GAME_OPTIONS: Record<string, string[]> = {
  'easy-onset': ['Bubble Pop', 'Arctic Archery', 'Penguin Putt'],
  'slow-speech': ['Glacier Glide', 'Arctic Connect', 'Ice Chess'],
  'stretchy-speech': ['Rainbow Stretch', 'Ice Slingshot', 'Arctic Fishing'],
  cancellations: ['Ice Chess Reset', 'Penguin Strike Again'],
  'light-contact': ['Ice Card Tower', 'Arctic Jenga'],
};

export const DIFFICULTY_LEVELS = ['Words', 'Phrases', 'Sentences'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const WEEKLY_CLASS_AVERAGE = [65, 68, 71, 74, 78, 80, 82];
export const WEEKLY_TARGET_SCORE = [80, 80, 80, 80, 80, 80, 80];
export const WEEKDAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type StrategyPerformance = {
  key: string;
  label: string;
  score: number;
};

export const STRATEGY_PERFORMANCE: StrategyPerformance[] = [
  { key: 'easy-onset', label: 'Easy Onset', score: 84 },
  { key: 'slow-speech', label: 'Slow Speech', score: 71 },
  { key: 'stretchy-speech', label: 'Stretchy Speech', score: 68 },
  { key: 'light-contact', label: 'Light Contact', score: 79 },
  { key: 'cancellations', label: 'Cancellations', score: 61 },
];
