// Daily open-ended check-in — shown once per day before Home. Purely reflective, never
// scored, stored per date. Session-scoped like the other new contexts this session (no local
// persistence layer wired up yet), so "once per day" holds for the life of the app process —
// a real day-boundary gate that survives app restarts needs the local DB layer wired in.

import { createContext, ReactNode, useContext, useState } from 'react';

export type CheckInEntry = {
  date: string; // YYYY-MM-DD
  question: string;
  textResponse: string;
  hasVoiceNote: boolean;
};

type CheckInContextValue = {
  entries: Record<string, CheckInEntry>;
  hasCheckedInToday: boolean;
  submitCheckIn: (entry: CheckInEntry) => void;
};

const CheckInContext = createContext<CheckInContextValue | null>(null);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckInProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, CheckInEntry>>({});

  const submitCheckIn = (entry: CheckInEntry) => {
    setEntries((prev) => ({ ...prev, [entry.date]: entry }));
  };

  return (
    <CheckInContext.Provider value={{ entries, hasCheckedInToday: todayKey() in entries, submitCheckIn }}>
      {children}
    </CheckInContext.Provider>
  );
}

export function useCheckIn() {
  const ctx = useContext(CheckInContext);
  if (!ctx) {
    throw new Error('useCheckIn must be used within a CheckInProvider');
  }
  return ctx;
}
