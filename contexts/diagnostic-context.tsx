// Stores Sound Diagnostic Assessment runs — session-scoped like the other new contexts this
// session. Supports the "re-run periodically with before/after comparison" requirement by
// keeping every run, not just the latest.

import { createContext, ReactNode, useContext, useState } from 'react';

import { DisfluencyFlag } from '@/game-engine/useDiagnosticRecording';
import { SoundCategory } from '@/content/diagnosticWords';
import { Strategy } from '@/contexts/strategy-context';

export type DiagnosticWordResult = {
  word: string;
  category: SoundCategory;
  struggled: boolean;
  flags: DisfluencyFlag[];
};

export type StrategyEffectivenessResult = {
  strategy: Strategy;
  word: string;
  success: boolean;
};

export type DiagnosticRun = {
  id: string;
  date: string; // ISO 8601
  wordResults: DiagnosticWordResult[];
  strategyResults: StrategyEffectivenessResult[];
};

type DiagnosticContextValue = {
  runs: DiagnosticRun[];
  addRun: (run: DiagnosticRun) => void;
};

const DiagnosticContext = createContext<DiagnosticContextValue | null>(null);

export function DiagnosticProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<DiagnosticRun[]>([]);

  const addRun = (run: DiagnosticRun) => {
    setRuns((prev) => [...prev, run]);
  };

  return <DiagnosticContext.Provider value={{ runs, addRun }}>{children}</DiagnosticContext.Provider>;
}

export function useDiagnostic() {
  const ctx = useContext(DiagnosticContext);
  if (!ctx) {
    throw new Error('useDiagnostic must be used within a DiagnosticProvider');
  }
  return ctx;
}
