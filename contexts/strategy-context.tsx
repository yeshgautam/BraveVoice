// App-wide active strategy + difficulty tier — read by every Big Voice game via useStrategy().
// Session-scoped (in-memory only): this app has no local persistence layer wired up yet
// (no AsyncStorage/SQLite settings table), so like the other per-session settings contexts in
// this codebase (see game-settings-context.tsx) this resets
// on app restart rather than persisting silently-wrong assumptions across sessions.

import { createContext, ReactNode, useContext, useState } from 'react';

export type Strategy = 'easyOnset' | 'lightContact' | 'slowSpeech' | 'stretchySpeech' | 'cancellation';

export type StrategyMeta = {
  key: Strategy;
  label: string;
  description: string;
  icon: string;
};

export const STRATEGIES: StrategyMeta[] = [
  { key: 'easyOnset', label: 'Easy Onset', description: 'Start words with a gentle, easy breath', icon: '🌬️' },
  { key: 'lightContact', label: 'Light Contact', description: 'Touch your lips and tongue very softly', icon: '🪶' },
  { key: 'slowSpeech', label: 'Slow Speech', description: 'Take your time with every word', icon: '🐢' },
  { key: 'stretchySpeech', label: 'Stretchy Speech', description: 'Stretch your words out long and smooth', icon: '🎈' },
  { key: 'cancellation', label: 'Cancellation', description: 'Finish the word, pause, then say it again smoothly', icon: '🔁' },
];

export const STRATEGY_META: Record<Strategy, StrategyMeta> = Object.fromEntries(STRATEGIES.map((s) => [s.key, s])) as Record<
  Strategy,
  StrategyMeta
>;

export type DifficultyTier = 'word' | 'phrase' | 'sentence' | 'connectedSpeech';

export const DIFFICULTY_TIERS: { key: DifficultyTier; label: string }[] = [
  { key: 'word', label: 'Word' },
  { key: 'phrase', label: 'Phrase' },
  { key: 'sentence', label: 'Sentence' },
  { key: 'connectedSpeech', label: 'Connected Speech' },
];

type StrategyContextValue = {
  activeStrategy: Strategy;
  setActiveStrategy: (strategy: Strategy) => void;
  difficultyTier: DifficultyTier;
  setDifficultyTier: (tier: DifficultyTier) => void;
};

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function StrategyProvider({ children }: { children: ReactNode }) {
  const [activeStrategy, setActiveStrategy] = useState<Strategy>('easyOnset');
  const [difficultyTier, setDifficultyTier] = useState<DifficultyTier>('word');

  return (
    <StrategyContext.Provider value={{ activeStrategy, setActiveStrategy, difficultyTier, setDifficultyTier }}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy() {
  const ctx = useContext(StrategyContext);
  if (!ctx) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  return ctx;
}
