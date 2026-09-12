// Fetches homework assigned by the therapist (via the app's admin flow, written to the
// "Homework Assignments" sheet tab). Falls back to the last cached assignment (this
// device's local `homework_completions` table) whenever the server can't be reached, so
// the home screen still has something to show offline.

import {
  findHomeworkCompletion,
  insertHomeworkCompletion,
  listHomeworkCompletions,
} from '@/lib/session-sync/database';
import { getAuthToken } from '@/lib/session-sync/student-identity';
import { AssignedHomework, HOMEWORK_COMPLETE_SESSION_THRESHOLD, HomeworkChallenge } from '@/lib/session-sync/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.bravevoice.app/v1';

export type FetchHomeworkResult = {
  source: 'server' | 'cache';
  challenges: HomeworkChallenge[];
};

export async function fetchHomework(studentCode: string, classCode: string): Promise<FetchHomeworkResult> {
  if (!studentCode || !classCode) {
    return { source: 'cache', challenges: cachedChallenges(studentCode, classCode) };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/homework/${encodeURIComponent(studentCode)}`, {
      headers: {
        Authorization: getAuthToken(),
        'x-class-code': classCode,
      },
    });
    if (!response.ok) throw new Error(`homework fetch failed: ${response.status}`);

    const data = (await response.json()) as { homework: AssignedHomework[] };
    const assigned = data.homework ?? [];
    const challenges = assigned.map((item) => mergeWithLocalProgress(studentCode, classCode, item));

    return { source: 'server', challenges };
  } catch {
    // Offline or backend unreachable — fall back to what was cached from the last
    // successful fetch.
    return { source: 'cache', challenges: cachedChallenges(studentCode, classCode) };
  }
}

/** Upserts a local progress row for this assignment (if one doesn't exist yet) and merges it in. */
function mergeWithLocalProgress(studentCode: string, classCode: string, item: AssignedHomework): HomeworkChallenge {
  let local = findHomeworkCompletion(studentCode, classCode, item.game, item.strategy);
  if (!local) {
    local = insertHomeworkCompletion({
      studentCode,
      classCode,
      gameName: item.game,
      strategyName: item.strategy,
      assignedDate: item.assigned,
      completedDate: null,
      status: 'not_started',
      sessionsCompleted: 0,
      averageFluencyScore: 0,
    });
  }

  return {
    game: item.game,
    strategy: item.strategy,
    focus: item.focus,
    due: item.due,
    status: local.status,
    progress: Math.min(1, local.sessionsCompleted / HOMEWORK_COMPLETE_SESSION_THRESHOLD),
  };
}

function cachedChallenges(studentCode: string, classCode: string): HomeworkChallenge[] {
  if (!studentCode || !classCode) return [];

  return listHomeworkCompletions(studentCode, classCode)
    .filter((hw) => hw.status !== 'completed')
    .map((hw) => ({
      game: hw.gameName,
      strategy: hw.strategyName,
      status: hw.status,
      progress: Math.min(1, hw.sessionsCompleted / HOMEWORK_COMPLETE_SESSION_THRESHOLD),
    }));
}
