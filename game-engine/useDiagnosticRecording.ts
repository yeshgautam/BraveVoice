// Recording + scoring engine for the Sound Diagnostic Assessment baseline pass. Deliberately
// separate from useSpeechMetric: that hook scores against ONE active strategy's technique;
// this one applies no strategy at all and instead flags general disfluency *signals* (onset
// delay, repetition, prolongation, block-like pause) from the same amplitude-envelope proxy.
// Recording lifecycle now comes from the same shared useVoiceRecorder every other pipeline in
// the app uses — this file only adds the disfluency-flag scoring on top.
//
// Like useSpeechMetric, this is a simplified gameplay-feedback proxy, not clinical-grade
// stutter detection.

import { useCallback } from 'react';

import { useMicCalibration } from '@/contexts/mic-calibration-context';
import { useVoiceRecorder } from '@/game-engine/useVoiceRecorder';
import { Sample, VOICE_THRESHOLD, segmentVoicedBursts } from '@/game-engine/speechScoring';

export type DisfluencyFlag = 'onsetDelay' | 'repetition' | 'prolongation' | 'blockLikePause';

export type DiagnosticAttemptResult = {
  struggled: boolean;
  flags: DisfluencyFlag[];
  durationMs: number;
  noSpeechDetected?: boolean;
  interrupted?: boolean;
};

// "Take your time" is the actual instruction shown to the child here, so this pass gets a
// generous ceiling to match — long enough for a real onset delay (itself a flag we're looking
// for) plus a full word plus a natural trailing pause, without cutting a slow attempt off.
const MAX_DURATION_MS = 6500;
const BURST_GAP_MS = 200;

function scoreDiagnosticAttempt(samples: Sample[]): { flags: DisfluencyFlag[] } {
  const flags: DisfluencyFlag[] = [];
  const firstVoicedIdx = samples.findIndex((s) => s.level > VOICE_THRESHOLD);
  if (firstVoicedIdx === -1) return { flags };

  // Onset delay: a long hesitation before any sound starts.
  if (samples[firstVoicedIdx].t > 700) flags.push('onsetDelay');

  const bursts = segmentVoicedBursts(samples, BURST_GAP_MS);

  // Repetition: several short bursts close together (repeated sound/word attempts).
  const shortBursts = bursts.filter((b) => b.end - b.start < 300);
  if (shortBursts.length >= 2) {
    for (let i = 1; i < shortBursts.length; i++) {
      if (shortBursts[i].start - shortBursts[i - 1].end < 300) {
        flags.push('repetition');
        break;
      }
    }
  }

  // Prolongation: one sustained burst held unusually long.
  const longest = bursts.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a), bursts[0]);
  if (longest && longest.end - longest.start > 900) flags.push('prolongation');

  // Block-like pause: voice starts, stops for a beat mid-attempt, then resumes.
  if (bursts.length >= 2) {
    for (let i = 1; i < bursts.length; i++) {
      const gap = bursts[i].start - bursts[i - 1].end;
      if (gap >= 300 && gap <= 2000) {
        flags.push('blockLikePause');
        break;
      }
    }
  }

  return { flags: Array.from(new Set(flags)) };
}

export function useDiagnosticRecording() {
  const { baselineDb } = useMicCalibration();
  // 'auto' end mode with the shared long silence tolerance: a hesitant onset (exactly what
  // this pass is trying to detect) shouldn't get cut off by an eager auto-stop.
  const recorder = useVoiceRecorder({ endMode: 'auto', maxDurationMs: MAX_DURATION_MS, calibratedFloorDb: baselineDb });

  const start = useCallback((): Promise<DiagnosticAttemptResult> => {
    return recorder.start().then((raw) => {
      if (raw.noSpeechDetected) {
        return { struggled: false, flags: [], durationMs: raw.durationMs, noSpeechDetected: true, interrupted: raw.interrupted };
      }
      const { flags } = scoreDiagnosticAttempt(raw.samples);
      return { struggled: flags.length > 0, flags, durationMs: raw.durationMs, interrupted: raw.interrupted };
    });
  }, [recorder]);

  return {
    start,
    /** Manually ends the current attempt early. Always available once recording has started. */
    stop: recorder.stop,
    isRecording: recorder.isRecording,
    isPrepping: recorder.isPrepping,
    isProcessing: recorder.isProcessing,
    liveWaveform: recorder.liveWaveform,
    permissionDenied: recorder.permissionDenied,
  };
}
