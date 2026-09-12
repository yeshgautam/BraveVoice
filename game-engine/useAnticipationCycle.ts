// Drives the "get ready" beat every live-action game needs between the mic tap and the
// action actually becoming visible: mic tap → recording starts immediately (useSpeechMetric
// treats the first ~200ms as ambient calibration anyway, so this costs nothing), but the
// *visual* action is held back for `anticipationMs` so there's a genuine anticipation beat
// (a breath drawn, a stance taken) before the live draw/swing/charge appears.

import { useEffect, useRef, useState } from 'react';

import type { GameStageProps } from '@/game-engine/GameScreen';

export type ActionSubPhase = 'idle' | 'anticipating' | 'active';

export function useAnticipationCycle(phase: GameStageProps['phase'], anticipationMs = 400) {
  const [subPhase, setSubPhase] = useState<ActionSubPhase>('idle');
  const subPhaseRef = useRef<ActionSubPhase>('idle');

  const set = (next: ActionSubPhase) => {
    setSubPhase(next);
    subPhaseRef.current = next;
  };

  useEffect(() => {
    if (phase === 'recording') {
      set('anticipating');
      const t = setTimeout(() => set('active'), anticipationMs);
      return () => clearTimeout(t);
    }
    if (phase === 'ready') {
      set('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return { subPhase, subPhaseRef, setSubPhase: set };
}
