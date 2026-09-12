// Expo/TypeScript equivalent of the spec's `SyncService` — uploads unsynced sessions to
// the backend API whenever WiFi is available. Never syncs on cellular, to protect
// family data plans.

import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';

import { getUnsyncedSessionRecords, markSessionRecordsSynced } from '@/lib/session-sync/database';
import { getAuthToken } from '@/lib/session-sync/student-identity';
import { SessionRecord, SessionSyncPayload } from '@/lib/session-sync/types';

// Replace with your deployed backend URL — see /server for the reference implementation.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.bravevoice.app/v1';

let netInfoSubscription: NetInfoSubscription | null = null;
let isSyncing = false;

/** Call once on app launch. Triggers a sync whenever the device connects to WiFi. */
export function startMonitoring(): void {
  if (netInfoSubscription) return;
  netInfoSubscription = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.type === 'wifi') {
      syncIfPossible();
    }
  });
}

export function stopMonitoring(): void {
  netInfoSubscription?.();
  netInfoSubscription = null;
}

/** Call on app foreground and immediately after saving a session. Safe to call often. */
export async function syncIfPossible(): Promise<void> {
  if (isSyncing) return;

  const unsynced = getUnsyncedSessionRecords();
  if (unsynced.length === 0) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected || netState.type !== 'wifi') return;

  isSyncing = true;
  try {
    await syncSessions(unsynced);
  } finally {
    isSyncing = false;
  }
}

async function syncSessions(sessions: SessionRecord[]): Promise<void> {
  const payload: SessionSyncPayload[] = sessions.map((record) => ({
    student_code: record.studentCode,
    class_code: record.classCode,
    session_date: record.sessionDate,
    game_name: record.gameName,
    strategy_name: record.strategyName,
    words_attempted: record.wordsAttempted,
    words_correct: record.wordsCorrect,
    fluency_score: record.fluencyScore,
    stars_earned: record.starsEarned,
    duration_seconds: record.durationSeconds,
    stutter_events: record.stutterEventsCount,
    block_count: record.blockCount,
    repetition_count: record.repetitionCount,
    prolongation_count: record.prolongationCount,
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/sessions/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthToken(),
      },
      body: JSON.stringify({ sessions: payload }),
    });

    if (response.ok) {
      markSessionRecordsSynced(sessions.map((s) => s.id));
    }
  } catch {
    // Offline or the backend is unreachable — rows stay unsynced and retry on the next
    // WiFi connect or foreground event.
  }
}
