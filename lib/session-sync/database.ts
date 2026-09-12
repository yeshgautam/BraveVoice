// Local, on-device storage for the therapist sync pipeline. This is the Expo/SQLite
// equivalent of the Core Data store described in the sync spec: session data is written
// here immediately after every game, tagged `synced = 0`, and the sync service later
// flips rows to `synced = 1` once the backend has accepted them.
//
// Only what's needed for therapist reporting lives here — no audio, no transcripts,
// no real name, no location.

import { openDatabaseSync } from 'expo-sqlite';

import { HomeworkCompletion, NewHomeworkCompletion, NewSessionRecord, SessionRecord } from '@/lib/session-sync/types';

const db = openDatabaseSync('bravevoice_sync.db');

db.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS session_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT NOT NULL,
    class_code TEXT NOT NULL,
    session_date TEXT NOT NULL,
    game_name TEXT NOT NULL,
    strategy_name TEXT NOT NULL,
    words_attempted INTEGER NOT NULL,
    words_correct INTEGER NOT NULL,
    fluency_score REAL NOT NULL,
    stars_earned INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    stutter_events_count INTEGER NOT NULL,
    block_count INTEGER NOT NULL,
    repetition_count INTEGER NOT NULL,
    prolongation_count INTEGER NOT NULL,
    strategy_score REAL NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS homework_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_code TEXT NOT NULL,
    class_code TEXT NOT NULL,
    game_name TEXT NOT NULL,
    strategy_name TEXT NOT NULL,
    assigned_date TEXT NOT NULL,
    completed_date TEXT,
    status TEXT NOT NULL,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    average_fluency_score REAL NOT NULL DEFAULT 0,
    synced INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS app_identity (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

type SessionRecordRow = {
  id: number;
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
  stutter_events_count: number;
  block_count: number;
  repetition_count: number;
  prolongation_count: number;
  strategy_score: number;
  synced: number;
};

function toSessionRecord(row: SessionRecordRow): SessionRecord {
  return {
    id: row.id,
    studentCode: row.student_code,
    classCode: row.class_code,
    sessionDate: row.session_date,
    gameName: row.game_name,
    strategyName: row.strategy_name,
    wordsAttempted: row.words_attempted,
    wordsCorrect: row.words_correct,
    fluencyScore: row.fluency_score,
    starsEarned: row.stars_earned,
    durationSeconds: row.duration_seconds,
    stutterEventsCount: row.stutter_events_count,
    blockCount: row.block_count,
    repetitionCount: row.repetition_count,
    prolongationCount: row.prolongation_count,
    strategyScore: row.strategy_score,
    synced: row.synced === 1,
  };
}

export function insertSessionRecord(record: NewSessionRecord): SessionRecord {
  const result = db.runSync(
    `INSERT INTO session_records (
      student_code, class_code, session_date, game_name, strategy_name,
      words_attempted, words_correct, fluency_score, stars_earned, duration_seconds,
      stutter_events_count, block_count, repetition_count, prolongation_count, strategy_score, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    record.studentCode,
    record.classCode,
    record.sessionDate,
    record.gameName,
    record.strategyName,
    record.wordsAttempted,
    record.wordsCorrect,
    record.fluencyScore,
    record.starsEarned,
    record.durationSeconds,
    record.stutterEventsCount,
    record.blockCount,
    record.repetitionCount,
    record.prolongationCount,
    record.strategyScore
  );

  const row = db.getFirstSync<SessionRecordRow>('SELECT * FROM session_records WHERE id = ?', result.lastInsertRowId);
  if (!row) throw new Error('Failed to read back inserted session record');
  return toSessionRecord(row);
}

export function getUnsyncedSessionRecords(): SessionRecord[] {
  const rows = db.getAllSync<SessionRecordRow>('SELECT * FROM session_records WHERE synced = 0');
  return rows.map(toSessionRecord);
}

export function markSessionRecordsSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  db.runSync(`UPDATE session_records SET synced = 1 WHERE id IN (${placeholders})`, ...ids);
}

type HomeworkCompletionRow = {
  id: number;
  student_code: string;
  class_code: string;
  game_name: string;
  strategy_name: string;
  assigned_date: string;
  completed_date: string | null;
  status: string;
  sessions_completed: number;
  average_fluency_score: number;
  synced: number;
};

function toHomeworkCompletion(row: HomeworkCompletionRow): HomeworkCompletion {
  return {
    id: row.id,
    studentCode: row.student_code,
    classCode: row.class_code,
    gameName: row.game_name,
    strategyName: row.strategy_name,
    assignedDate: row.assigned_date,
    completedDate: row.completed_date,
    status: row.status as HomeworkCompletion['status'],
    sessionsCompleted: row.sessions_completed,
    averageFluencyScore: row.average_fluency_score,
    synced: row.synced === 1,
  };
}

export function insertHomeworkCompletion(record: NewHomeworkCompletion): HomeworkCompletion {
  const result = db.runSync(
    `INSERT INTO homework_completions (
      student_code, class_code, game_name, strategy_name, assigned_date,
      completed_date, status, sessions_completed, average_fluency_score, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    record.studentCode,
    record.classCode,
    record.gameName,
    record.strategyName,
    record.assignedDate,
    record.completedDate,
    record.status,
    record.sessionsCompleted,
    record.averageFluencyScore
  );

  const row = db.getFirstSync<HomeworkCompletionRow>(
    'SELECT * FROM homework_completions WHERE id = ?',
    result.lastInsertRowId
  );
  if (!row) throw new Error('Failed to read back inserted homework completion');
  return toHomeworkCompletion(row);
}

export function getUnsyncedHomeworkCompletions(): HomeworkCompletion[] {
  const rows = db.getAllSync<HomeworkCompletionRow>('SELECT * FROM homework_completions WHERE synced = 0');
  return rows.map(toHomeworkCompletion);
}

export function markHomeworkCompletionsSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  db.runSync(`UPDATE homework_completions SET synced = 1 WHERE id IN (${placeholders})`, ...ids);
}

export function findHomeworkCompletion(
  studentCode: string,
  classCode: string,
  gameName: string,
  strategyName: string
): HomeworkCompletion | null {
  const row = db.getFirstSync<HomeworkCompletionRow>(
    `SELECT * FROM homework_completions
     WHERE student_code = ? AND class_code = ? AND game_name = ? AND strategy_name = ?
     ORDER BY id DESC LIMIT 1`,
    studentCode,
    classCode,
    gameName,
    strategyName
  );
  return row ? toHomeworkCompletion(row) : null;
}

export function updateHomeworkProgress(
  id: number,
  progress: { sessionsCompleted: number; averageFluencyScore: number; status: HomeworkCompletion['status']; completedDate: string | null }
): void {
  db.runSync(
    `UPDATE homework_completions
     SET sessions_completed = ?, average_fluency_score = ?, status = ?, completed_date = ?, synced = 0
     WHERE id = ?`,
    progress.sessionsCompleted,
    progress.averageFluencyScore,
    progress.status,
    progress.completedDate,
    id
  );
}

export function listHomeworkCompletions(studentCode: string, classCode: string): HomeworkCompletion[] {
  const rows = db.getAllSync<HomeworkCompletionRow>(
    'SELECT * FROM homework_completions WHERE student_code = ? AND class_code = ? ORDER BY id DESC',
    studentCode,
    classCode
  );
  return rows.map(toHomeworkCompletion);
}

export function getIdentityValue(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM app_identity WHERE key = ?', key);
  return row?.value ?? null;
}

export function setIdentityValue(key: string, value: string): void {
  db.runSync('INSERT OR REPLACE INTO app_identity (key, value) VALUES (?, ?)', key, value);
}
