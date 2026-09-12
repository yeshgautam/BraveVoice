// Device mic baseline from the onboarding "Say Hi Fin!" check — every recording pipeline
// (useSpeechMetric, useDiagnosticRecording, the check-in voice note) reads `baselineDb` to seed
// its ambient-floor / automatic-gain-normalization calibration instead of a fixed guess, so a
// loud room or a quiet device doesn't unfairly skew scoring from the very first attempt.
// Session-scoped like the other contexts here (no local persistence layer wired up yet) — the
// mic check re-runs each fresh app process, same as onboarding itself does.

import { createContext, ReactNode, useContext, useState } from 'react';

type MicCalibrationContextValue = {
  /** Ambient-floor dB reading captured during the onboarding mic check, if the child has done
   * it this session. Undefined means "not calibrated yet" — callers fall back to the shared
   * static default rather than treating 0/null as a real reading. */
  baselineDb: number | undefined;
  calibrated: boolean;
  setBaseline: (db: number) => void;
};

const MicCalibrationContext = createContext<MicCalibrationContextValue | null>(null);

export function MicCalibrationProvider({ children }: { children: ReactNode }) {
  const [baselineDb, setBaselineDb] = useState<number | undefined>(undefined);

  const setBaseline = (db: number) => setBaselineDb(db);

  return (
    <MicCalibrationContext.Provider value={{ baselineDb, calibrated: baselineDb !== undefined, setBaseline }}>
      {children}
    </MicCalibrationContext.Provider>
  );
}

export function useMicCalibration() {
  const ctx = useContext(MicCalibrationContext);
  if (!ctx) {
    throw new Error('useMicCalibration must be used within a MicCalibrationProvider');
  }
  return ctx;
}
