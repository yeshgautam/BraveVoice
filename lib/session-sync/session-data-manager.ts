// Expo/TypeScript equivalent of the spec's `SessionDataManager` — saves a completed
// game session to local storage immediately, then attempts a sync. Never waits on the
// network: the row is durable in SQLite the instant this returns.

import { findHomeworkCompletion, insertSessionRecord, updateHomeworkProgress } from '@/lib/session-sync/database';
import * as syncService from '@/lib/session-sync/sync-service';
import { getClassCode, getOrCreateStudentCode } from '@/lib/session-sync/student-identity';
import {
  EMPTY_STUTTER_SUMMARY,
  HOMEWORK_COMPLETE_SESSION_THRESHOLD,
  SessionRecord,
  StutterSummary,
} from '@/lib/session-sync/types';

export type SaveSessionParams = {
  gameName: string;
  strategyName: string;
  wordsAttempted: number;
  wordsCorrect: number;
  fluencyScore: number;
  starsEarned: number;
  durationSeconds: number;
  strategyScore: number;
  stutterEvents?: StutterSummary;
};

export function saveSession(params: SaveSessionParams): SessionRecord {
  const studentCode = getOrCreateStudentCode();
  const classCode = getClassCode();
  const stutterEvents = params.stutterEvents ?? EMPTY_STUTTER_SUMMARY;

  const record = insertSessionRecord({
    studentCode,
    classCode,
    sessionDate: new Date().toISOString(),
    gameName: params.gameName,
    strategyName: params.strategyName,
    wordsAttempted: params.wordsAttempted,
    wordsCorrect: params.wordsCorrect,
    fluencyScore: params.fluencyScore,
    starsEarned: params.starsEarned,
    durationSeconds: params.durationSeconds,
    stutterEventsCount: stutterEvents.total,
    blockCount: stutterEvents.blocks,
    repetitionCount: stutterEvents.repetitions,
    prolongationCount: stutterEvents.prolongations,
    strategyScore: params.strategyScore,
  });

  if (classCode) {
    applyHomeworkProgress(studentCode, classCode, params.gameName, params.strategyName, params.fluencyScore);
  }

  // Attempt sync immediately if online; syncIfPossible no-ops when offline or on cellular.
  syncService.syncIfPossible();

  return record;
}

function applyHomeworkProgress(
  studentCode: string,
  classCode: string,
  gameName: string,
  strategyName: string,
  fluencyScore: number
): void {
  const homework = findHomeworkCompletion(studentCode, classCode, gameName, strategyName);
  if (!homework || homework.status === 'completed') return;

  const sessionsCompleted = homework.sessionsCompleted + 1;
  const averageFluencyScore =
    (homework.averageFluencyScore * homework.sessionsCompleted + fluencyScore) / sessionsCompleted;
  const status = sessionsCompleted >= HOMEWORK_COMPLETE_SESSION_THRESHOLD ? 'completed' : 'partial';

  updateHomeworkProgress(homework.id, {
    sessionsCompleted,
    averageFluencyScore,
    status,
    completedDate: status === 'completed' ? new Date().toISOString() : homework.completedDate,
  });
}
