// Shared foundation every Rewards screen plugs into: the "stars" currency, per-strategy
// mastery tiers, and Fin/Arctic-HQ cosmetic ownership + equip state.
//
// Deliberately NOT a bare hook — this is app-wide shared state (Fin needs to render the same
// equipped items whether you're on Home, in a game, or in onboarding), so like every other
// piece of cross-screen state in this app (useProgress, useStrategy, ...) it's a Context.
//
// Persisted to the same on-device SQLite key-value store progress-context.tsx uses (see that
// file's comment) so unlocks/equips/HQ layout survive closing and reopening the app, tied to
// this device's profile.
//
// Currency: stars are NOT a separate counter. Total earned stars is derived from the existing
// XP counter (xpToStars(totalXP) — the same conversion already used for level progress), and
// this context only adds a spending ledger (`starsSpent`) on top, so spending never distorts
// totalXP/leveling elsewhere in the app.
//
// Mastery: tiers are derived from `strategyAttempts` (cumulative successful rounds per
// strategy), which progress-context.tsx already accumulates from the exact same
// recordGameResult event categoryProgress uses — not a parallel counter either.

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { CategoryKey, useProgress, xpToStars } from '@/contexts/progress-context';
import { Strategy } from '@/contexts/strategy-context';
import { FIN_ITEMS, FinItemCategory, findFinItem } from '@/content/finItems';
import { HQ_ITEMS, findHqItem } from '@/content/hqItems';
import { getIdentityValue, setIdentityValue } from '@/lib/session-sync/database';

export type MasteryTier = 'bronze' | 'silver' | 'gold';

/** Bronze 0-24, Silver 25-74, Gold 75+ successful attempts in that strategy. */
export const MASTERY_TIER_THRESHOLDS: { silver: number; gold: number } = { silver: 25, gold: 75 };

export function tierForAttempts(attempts: number): MasteryTier {
  if (attempts >= MASTERY_TIER_THRESHOLDS.gold) return 'gold';
  if (attempts >= MASTERY_TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export type MasteryProgress = {
  tier: MasteryTier;
  attempts: number;
  /** Null once at Gold — there's no next tier to progress toward. */
  nextTier: MasteryTier | null;
  /** Attempts still needed to reach nextTier. 0 if already at Gold. */
  remainingToNextTier: number;
  /** Threshold the current tier started at, and the next tier's threshold — for progress bars. */
  currentTierFloor: number;
  nextTierThreshold: number | null;
};

export function masteryProgressForAttempts(attempts: number): MasteryProgress {
  if (attempts >= MASTERY_TIER_THRESHOLDS.gold) {
    return { tier: 'gold', attempts, nextTier: null, remainingToNextTier: 0, currentTierFloor: MASTERY_TIER_THRESHOLDS.gold, nextTierThreshold: null };
  }
  if (attempts >= MASTERY_TIER_THRESHOLDS.silver) {
    return {
      tier: 'silver',
      attempts,
      nextTier: 'gold',
      remainingToNextTier: MASTERY_TIER_THRESHOLDS.gold - attempts,
      currentTierFloor: MASTERY_TIER_THRESHOLDS.silver,
      nextTierThreshold: MASTERY_TIER_THRESHOLDS.gold,
    };
  }
  return {
    tier: 'bronze',
    attempts,
    nextTier: 'silver',
    remainingToNextTier: MASTERY_TIER_THRESHOLDS.silver - attempts,
    currentTierFloor: 0,
    nextTierThreshold: MASTERY_TIER_THRESHOLDS.silver,
  };
}

const CATEGORY_TO_STRATEGY: Record<CategoryKey, Strategy> = {
  'easy-onset': 'easyOnset',
  'light-contact': 'lightContact',
  'slow-speech': 'slowSpeech',
  'stretchy-speech': 'stretchySpeech',
  cancellation: 'cancellation',
};

type RewardsContextValue = {
  /** Total stars ever earned (derived from XP — never decreases). */
  totalStarsEarned: number;
  /** Stars available to spend right now (totalStarsEarned - starsSpent). */
  availableStars: number;

  masteryByStrategy: Record<Strategy, MasteryProgress>;

  unlockedFinItemKeys: string[];
  equippedFinItemKeys: Partial<Record<FinItemCategory, string>>;
  /** Spends stars and unlocks the item. Returns false (no-op) if already unlocked or unaffordable. */
  unlockFinItem: (key: string) => boolean;
  /** Toggles equip/unequip for an owned item. No-op if not owned. */
  toggleEquipFinItem: (key: string) => void;

  unlockedHqItemKeys: string[];
  /** slotKey -> itemKey placed there, or undefined if empty. */
  hqPlacements: Record<string, string | undefined>;
  unlockHqItem: (key: string) => boolean;
  /** Places an owned item into a slot (auto-removing it from any other slot it occupied), or
   * clears the slot when itemKey is null. */
  placeHqItem: (slotKey: string, itemKey: string | null) => void;
};

const RewardsContext = createContext<RewardsContextValue | null>(null);

const STORAGE_KEY = 'rewardsState';

type StoredRewardsState = {
  starsSpent: number;
  unlockedFinItemKeys: string[];
  equippedFinItemKeys: Partial<Record<FinItemCategory, string>>;
  unlockedHqItemKeys: string[];
  hqPlacements: Record<string, string | undefined>;
};

function loadStoredRewards(): StoredRewardsState | null {
  const raw = getIdentityValue(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredRewardsState;
  } catch {
    return null;
  }
}

export function RewardsProvider({ children }: { children: ReactNode }) {
  const { totalXP, strategyAttempts } = useProgress();

  const storedRef = useRef<StoredRewardsState | null>(null);
  if (storedRef.current === null) {
    storedRef.current = loadStoredRewards() ?? {
      starsSpent: 0,
      unlockedFinItemKeys: [],
      equippedFinItemKeys: {},
      unlockedHqItemKeys: [],
      hqPlacements: {},
    };
  }
  const stored = storedRef.current;

  const [starsSpent, setStarsSpent] = useState(stored.starsSpent);
  const [unlockedFinItemKeys, setUnlockedFinItemKeys] = useState<string[]>(stored.unlockedFinItemKeys);
  const [equippedFinItemKeys, setEquippedFinItemKeys] = useState<Partial<Record<FinItemCategory, string>>>(
    stored.equippedFinItemKeys
  );
  const [unlockedHqItemKeys, setUnlockedHqItemKeys] = useState<string[]>(stored.unlockedHqItemKeys);
  const [hqPlacements, setHqPlacements] = useState<Record<string, string | undefined>>(stored.hqPlacements);

  const totalStarsEarned = xpToStars(totalXP);
  const availableStars = Math.max(0, totalStarsEarned - starsSpent);

  const masteryByStrategy = useMemo(() => {
    return Object.fromEntries(
      (Object.entries(CATEGORY_TO_STRATEGY) as [CategoryKey, Strategy][]).map(([categoryKey, strategy]) => [
        strategy,
        masteryProgressForAttempts(strategyAttempts[categoryKey]),
      ])
    ) as Record<Strategy, MasteryProgress>;
  }, [strategyAttempts]);

  const unlockFinItem = (key: string): boolean => {
    if (unlockedFinItemKeys.includes(key)) return false;
    const item = findFinItem(key);
    if (!item || item.cost > availableStars) return false;
    setStarsSpent((spent) => spent + item.cost);
    setUnlockedFinItemKeys((keys) => [...keys, key]);
    return true;
  };

  const toggleEquipFinItem = (key: string) => {
    const item = findFinItem(key);
    if (!item || !unlockedFinItemKeys.includes(key)) return;
    setEquippedFinItemKeys((prev) => {
      const isEquipped = prev[item.category] === key;
      return { ...prev, [item.category]: isEquipped ? undefined : key };
    });
  };

  const unlockHqItem = (key: string): boolean => {
    if (unlockedHqItemKeys.includes(key)) return false;
    const item = findHqItem(key);
    if (!item || item.cost > availableStars) return false;
    setStarsSpent((spent) => spent + item.cost);
    setUnlockedHqItemKeys((keys) => [...keys, key]);
    return true;
  };

  const placeHqItem = (slotKey: string, itemKey: string | null) => {
    if (itemKey !== null && !unlockedHqItemKeys.includes(itemKey)) return;
    setHqPlacements((prev) => {
      const next: Record<string, string | undefined> = {};
      for (const [slot, placedKey] of Object.entries(prev)) {
        // Drop this item from wherever else it was placed — one physical piece, one slot.
        next[slot] = placedKey === itemKey ? undefined : placedKey;
      }
      next[slotKey] = itemKey ?? undefined;
      return next;
    });
  };

  useEffect(() => {
    const snapshot: StoredRewardsState = {
      starsSpent,
      unlockedFinItemKeys,
      equippedFinItemKeys,
      unlockedHqItemKeys,
      hqPlacements,
    };
    setIdentityValue(STORAGE_KEY, JSON.stringify(snapshot));
  }, [starsSpent, unlockedFinItemKeys, equippedFinItemKeys, unlockedHqItemKeys, hqPlacements]);

  const value: RewardsContextValue = {
    totalStarsEarned,
    availableStars,
    masteryByStrategy,
    unlockedFinItemKeys,
    equippedFinItemKeys,
    unlockFinItem,
    toggleEquipFinItem,
    unlockedHqItemKeys,
    hqPlacements,
    unlockHqItem,
    placeHqItem,
  };

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewardsState() {
  const ctx = useContext(RewardsContext);
  if (!ctx) {
    throw new Error('useRewardsState must be used within a RewardsProvider');
  }
  return ctx;
}

// Re-exported so screens can list the full catalog without importing content/ paths directly.
export { FIN_ITEMS, HQ_ITEMS };
