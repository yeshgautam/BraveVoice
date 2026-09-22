import { create } from 'zustand';

import { SOUND_SETS } from './words';
import { STATIONS } from './world';

export type Phase = 'splash' | 'playing' | 'challenge' | 'complete';

export type StationProgress = {
  /** How many words of this set the child has completed. */
  cleared: number;
  /** Stars earned, 0-3 per word attempt, summed. */
  stars: number;
};

type GameState = {
  phase: Phase;
  activeStationId: string | null;
  progress: Record<string, StationProgress>;
  totalStars: number;
  toast: string | null;
  muted: boolean;
  invertLook: boolean;

  start: () => void;
  openStation: (id: string) => void;
  closeStation: () => void;
  awardWord: (stationId: string, stars: number) => void;
  showToast: (text: string) => void;
  clearToast: () => void;
  toggleMute: () => void;
  toggleInvertLook: () => void;
  reset: () => void;
};

const emptyProgress = (): Record<string, StationProgress> =>
  Object.fromEntries(STATIONS.map((s) => [s.id, { cleared: 0, stars: 0 }]));

export const TOTAL_WORDS = SOUND_SETS.reduce((n, s) => n + s.words.length, 0);

export const useGame = create<GameState>((set, get) => ({
  phase: 'splash',
  activeStationId: null,
  progress: emptyProgress(),
  totalStars: 0,
  toast: null,
  muted: false,
  invertLook: false,

  start: () => set({ phase: 'playing' }),
  openStation: (id) => set({ phase: 'challenge', activeStationId: id }),
  closeStation: () => set((s) => ({ phase: s.phase === 'complete' ? 'complete' : 'playing', activeStationId: null })),

  awardWord: (stationId, stars) => {
    const state = get();
    const setIndex = STATIONS.find((s) => s.id === stationId)?.setIndex ?? 0;
    const wordCount = SOUND_SETS[setIndex].words.length;
    const current = state.progress[stationId] ?? { cleared: 0, stars: 0 };
    const cleared = Math.min(wordCount, current.cleared + 1);
    const progress = { ...state.progress, [stationId]: { cleared, stars: current.stars + stars } };
    const totalCleared = Object.values(progress).reduce((n, p) => n + p.cleared, 0);
    set({
      progress,
      totalStars: state.totalStars + stars,
      phase: totalCleared >= TOTAL_WORDS ? 'complete' : state.phase,
    });
  },

  showToast: (text) => set({ toast: text }),
  clearToast: () => set({ toast: null }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleInvertLook: () => set((s) => ({ invertLook: !s.invertLook })),
  reset: () => set({ phase: 'playing', activeStationId: null, progress: emptyProgress(), totalStars: 0, toast: null }),
}));

export const stationCleared = (p: StationProgress | undefined, setIndex: number) =>
  !!p && p.cleared >= SOUND_SETS[setIndex].words.length;
