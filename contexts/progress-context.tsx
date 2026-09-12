import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { getIdentityValue, setIdentityValue } from '@/lib/session-sync/database';
import { saveSession } from '@/lib/session-sync/session-data-manager';
import { StutterSummary } from '@/lib/session-sync/types';

export type CategoryKey = 'stretchy-speech' | 'light-contact' | 'cancellation' | 'easy-onset' | 'slow-speech';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  'stretchy-speech': 'Stretchy Speech',
  'light-contact': 'Light Contact',
  cancellation: 'Cancellation',
  'easy-onset': 'Easy Onset',
  'slow-speech': 'Slow Speech',
};

// Strategy name sent to the therapist sync pipeline — matches the naming the backend's
// Class Overview / Fluency Scores column mapping expects (plural "Cancellations").
const STRATEGY_SYNC_NAME: Record<CategoryKey, string> = {
  ...CATEGORY_LABELS,
  cancellation: 'Cancellations',
};

const CATEGORY_KEY_BY_STRATEGY: Record<string, CategoryKey> = Object.fromEntries(
  (Object.entries(STRATEGY_SYNC_NAME) as [CategoryKey, string][]).map(([key, name]) => [name, key])
);

/** Reverses STRATEGY_SYNC_NAME — used to route a therapist-assigned strategy name back to a game category. */
export function categoryKeyForStrategy(strategyName: string): CategoryKey | undefined {
  return CATEGORY_KEY_BY_STRATEGY[strategyName];
}

export const XP_PER_STAR = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export function xpToStars(xp: number) {
  return Math.round(xp / XP_PER_STAR);
}

type GameStat = { bestStars: number; plays: number };

type ProgressState = {
  totalXP: number;
  todayXP: number;
  streakDays: number;
  categoryProgress: Record<CategoryKey, number>;
  /** Cumulative successful rounds (wordsCorrect) ever recorded under each strategy category —
   * the source of truth for Rewards' per-strategy mastery tiers (see rewards-context.tsx).
   * Accumulated from the same recordGameResult event categoryProgress already uses, not a
   * separately-tracked counter. */
  strategyAttempts: Record<CategoryKey, number>;
  /** Timestamp (ms) of the first recordGameResult call for each category, or null if never
   * practiced — feeds the "how long you've been practicing" mastery summary. */
  firstPracticedAt: Record<CategoryKey, number | null>;
  gameStats: Record<string, GameStat>;
};

type RecordGameResultParams = {
  gameKey: string;
  categoryKey: CategoryKey;
  stars: number;
  gameName: string;
  wordsAttempted: number;
  wordsCorrect: number;
  durationSeconds: number;
  strategyScore: number; // 0.0 - 1.0
  stutterEvents?: StutterSummary;
};

type ProgressContextValue = ProgressState & {
  recordGameResult: (params: RecordGameResultParams) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function todayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const INITIAL_CATEGORY_PROGRESS: Record<CategoryKey, number> = {
  'stretchy-speech': 0,
  'light-contact': 0,
  cancellation: 0,
  'easy-onset': 0,
  'slow-speech': 0,
};

const INITIAL_STRATEGY_ATTEMPTS: Record<CategoryKey, number> = {
  'stretchy-speech': 0,
  'light-contact': 0,
  cancellation: 0,
  'easy-onset': 0,
  'slow-speech': 0,
};

const INITIAL_FIRST_PRACTICED_AT: Record<CategoryKey, number | null> = {
  'stretchy-speech': null,
  'light-contact': null,
  cancellation: null,
  'easy-onset': null,
  'slow-speech': null,
};

// Persisted to the same on-device SQLite key-value store the therapist-sync pipeline already
// uses for student identity (lib/session-sync/database.ts) — so progress/streak/XP survive
// closing and reopening the app, tied to this device's profile, without standing up a second
// storage mechanism. Reads are synchronous (expo-sqlite's *Sync APIs), so state can be
// hydrated directly in each useState's lazy initializer with no loading flash.
const STORAGE_KEY = 'progressState';

type StoredProgressState = {
  totalXP: number;
  todayXP: number;
  todayDate: string | null;
  streakDays: number;
  lastPlayedDate: string | null;
  categoryProgress: Record<CategoryKey, number>;
  strategyAttempts: Record<CategoryKey, number>;
  firstPracticedAt: Record<CategoryKey, number | null>;
  gameStats: Record<string, GameStat>;
};

function loadStoredProgress(): StoredProgressState | null {
  const raw = getIdentityValue(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredProgressState;
  } catch {
    return null;
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const storedRef = useRef<StoredProgressState | null>(null);
  if (storedRef.current === null) {
    storedRef.current = loadStoredProgress() ?? {
      totalXP: 0,
      todayXP: 0,
      todayDate: null,
      streakDays: 0,
      lastPlayedDate: null,
      categoryProgress: INITIAL_CATEGORY_PROGRESS,
      strategyAttempts: INITIAL_STRATEGY_ATTEMPTS,
      firstPracticedAt: INITIAL_FIRST_PRACTICED_AT,
      gameStats: {},
    };
  }
  const stored = storedRef.current;

  const [totalXP, setTotalXP] = useState(stored.totalXP);
  const [todayXP, setTodayXP] = useState(stored.todayXP);
  const [streakDays, setStreakDays] = useState(stored.streakDays);
  const [categoryProgress, setCategoryProgress] = useState(stored.categoryProgress);
  const [strategyAttempts, setStrategyAttempts] = useState(stored.strategyAttempts);
  const [firstPracticedAt, setFirstPracticedAt] = useState(stored.firstPracticedAt);
  const [gameStats, setGameStats] = useState<Record<string, GameStat>>(stored.gameStats);

  const lastPlayedDateRef = useRef<string | null>(stored.lastPlayedDate);
  const todayDateRef = useRef<string | null>(stored.todayDate);

  const recordGameResult = ({
    gameKey,
    categoryKey,
    stars,
    gameName,
    wordsAttempted,
    wordsCorrect,
    durationSeconds,
    strategyScore,
    stutterEvents,
  }: RecordGameResultParams) => {
    const xpEarned = stars * XP_PER_STAR;
    const now = new Date();
    const today = todayKey(now);

    setTotalXP((xp) => xp + xpEarned);

    if (todayDateRef.current !== today) {
      todayDateRef.current = today;
      setTodayXP(xpEarned);
    } else {
      setTodayXP((xp) => xp + xpEarned);
    }

    if (lastPlayedDateRef.current !== today) {
      const yesterday = todayKey(new Date(now.getTime() - DAY_MS));
      setStreakDays((days) => (lastPlayedDateRef.current === yesterday ? days + 1 : 1));
      lastPlayedDateRef.current = today;
    }

    setGameStats((stats) => {
      const prev = stats[gameKey] ?? { bestStars: 0, plays: 0 };
      return {
        ...stats,
        [gameKey]: { bestStars: Math.max(prev.bestStars, stars), plays: prev.plays + 1 },
      };
    });

    setCategoryProgress((progress) => ({
      ...progress,
      [categoryKey]: Math.max(progress[categoryKey], stars / 3),
    }));

    setStrategyAttempts((attempts) => ({
      ...attempts,
      [categoryKey]: attempts[categoryKey] + wordsCorrect,
    }));

    setFirstPracticedAt((prev) => (prev[categoryKey] !== null ? prev : { ...prev, [categoryKey]: now.getTime() }));

    saveSession({
      gameName,
      strategyName: STRATEGY_SYNC_NAME[categoryKey],
      wordsAttempted,
      wordsCorrect,
      fluencyScore: wordsAttempted > 0 ? wordsCorrect / wordsAttempted : 0,
      starsEarned: stars,
      durationSeconds,
      strategyScore,
      stutterEvents,
    });
  };

  useEffect(() => {
    const snapshot: StoredProgressState = {
      totalXP,
      todayXP,
      todayDate: todayDateRef.current,
      streakDays,
      lastPlayedDate: lastPlayedDateRef.current,
      categoryProgress,
      strategyAttempts,
      firstPracticedAt,
      gameStats,
    };
    setIdentityValue(STORAGE_KEY, JSON.stringify(snapshot));
  }, [totalXP, todayXP, streakDays, categoryProgress, strategyAttempts, firstPracticedAt, gameStats]);

  return (
    <ProgressContext.Provider
      value={{ totalXP, todayXP, streakDays, categoryProgress, strategyAttempts, firstPracticedAt, gameStats, recordGameResult }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return ctx;
}
