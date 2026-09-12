// Smooth Sailing Slider ratings — stored locally, session-scoped, for therapist/parent
// review only. Deliberately NOT wired into the real backend sync pipeline
// (lib/session-sync): that schema (SessionRecord/SessionSyncPayload) is a fixed contract
// with a live backend API, and adding a column there needs a backend-side change this app
// can't safely assume. This keeps the rating available locally (e.g. a future Parent/
// Therapist "session detail" view) without touching that contract blind.

import { createContext, ReactNode, useContext, useState } from 'react';

export type FluencyRating = 'veryRough' | 'bumpy' | 'prettySmooth' | 'smoothSailing';

export const FLUENCY_RATING_LABEL: Record<FluencyRating, string> = {
  veryRough: 'Very Rough Waters',
  bumpy: 'A Little Bumpy',
  prettySmooth: 'Pretty Smooth',
  smoothSailing: 'Smooth Sailing',
};

export type FluencyRatingEntry = {
  gameKey: string;
  rating: FluencyRating;
  recordedAt: string; // ISO 8601
};

type FluencyRatingContextValue = {
  entries: FluencyRatingEntry[];
  recordFluencyRating: (gameKey: string, rating: FluencyRating) => void;
};

const FluencyRatingContext = createContext<FluencyRatingContextValue | null>(null);

export function FluencyRatingProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<FluencyRatingEntry[]>([]);

  const recordFluencyRating = (gameKey: string, rating: FluencyRating) => {
    setEntries((prev) => [...prev, { gameKey, rating, recordedAt: new Date().toISOString() }]);
  };

  return <FluencyRatingContext.Provider value={{ entries, recordFluencyRating }}>{children}</FluencyRatingContext.Provider>;
}

export function useFluencyRatings() {
  const ctx = useContext(FluencyRatingContext);
  if (!ctx) {
    throw new Error('useFluencyRatings must be used within a FluencyRatingProvider');
  }
  return ctx;
}
