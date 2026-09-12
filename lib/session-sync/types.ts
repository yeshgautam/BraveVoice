// Shared types for the therapist sync pipeline: local storage (SQLite), the sync
// service, and the wire format sent to the backend API.

export type StutterSummary = {
  total: number;
  blocks: number;
  repetitions: number;
  prolongations: number;
};

export const EMPTY_STUTTER_SUMMARY: StutterSummary = {
  total: 0,
  blocks: 0,
  repetitions: 0,
  prolongations: 0,
};

// One row per completed game — mirrors the Core Data `SessionRecord` entity.
// No audio, no transcripts, no real name, no location.
export type SessionRecord = {
  id: number;
  studentCode: string;
  classCode: string;
  sessionDate: string; // ISO 8601
  gameName: string;
  strategyName: string;
  wordsAttempted: number;
  wordsCorrect: number;
  fluencyScore: number; // 0.0 - 1.0
  starsEarned: number; // 0-3
  durationSeconds: number;
  stutterEventsCount: number;
  blockCount: number;
  repetitionCount: number;
  prolongationCount: number;
  strategyScore: number; // 0.0 - 1.0, technique-specific score
  synced: boolean;
};

export type NewSessionRecord = Omit<SessionRecord, 'id' | 'synced'>;

// Tracks assigned homework completion — mirrors the Core Data `HomeworkCompletion` entity.
export type HomeworkStatus = 'completed' | 'partial' | 'not_started';

export type HomeworkCompletion = {
  id: number;
  studentCode: string;
  classCode: string;
  gameName: string;
  strategyName: string;
  assignedDate: string; // ISO 8601
  completedDate: string | null;
  status: HomeworkStatus;
  sessionsCompleted: number;
  averageFluencyScore: number;
  synced: boolean;
};

export type NewHomeworkCompletion = Omit<HomeworkCompletion, 'id' | 'synced'>;

// Wire format for POST /sessions/sync — matches the backend's expected snake_case body.
export type SessionSyncPayload = {
  student_code: string;
  class_code: string;
  session_date: string;
  game_name: string;
  strategy_name: string;
  words_attempted: number;
  words_correct: number;
  fluency_score: number;
  stars_earned: number;
  duration_seconds: number;
  stutter_events: number;
  block_count: number;
  repetition_count: number;
  prolongation_count: number;
};

// Raw wire format returned by GET /homework/:studentCode.
export type AssignedHomework = {
  strategy: string;
  game: string;
  focus: string;
  level: string;
  reps: number;
  assigned: string;
  due: string;
  status: string;
};

// A homework item finished after this many sessions — shared between the manager that
// tracks progress locally and the fetcher that reports it back to the home screen.
export const HOMEWORK_COMPLETE_SESSION_THRESHOLD = 3;

// Display-ready homework item for the home screen's challenge cards — merges the
// therapist's assignment (from the server, or cached locally if unreachable) with
// this device's own local progress toward it.
export type HomeworkChallenge = {
  game: string;
  strategy: string;
  focus?: string;
  due?: string;
  status: HomeworkStatus;
  progress: number; // 0.0 - 1.0, from local session tracking
};
