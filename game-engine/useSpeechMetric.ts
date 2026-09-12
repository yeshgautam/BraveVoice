// Shared gameplay-feedback engine for the 8+ "older mode" mini-games (plus Tic-Tac-Toe and the
// diagnostic assessment's bonus pass). Recording lifecycle, silence tolerance, live waveform,
// and interruption safety all live in useVoiceRecorder — this hook only adds per-strategy
// scoring on top of the calibrated samples it hands back. See useVoiceRecorder.ts and
// speechScoring.ts for the shared machinery every recording pipeline in the app now shares.
//
// IMPORTANT: This is a simplified gameplay-feedback proxy, not clinical-grade stutter or
// fluency detection — see speechScoring.ts for the full caveat.

import { useCallback } from 'react';

import { useMicCalibration } from '@/contexts/mic-calibration-context';
import { VoiceRecorderEndMode, useVoiceRecorder } from '@/game-engine/useVoiceRecorder';
import {
  Sample,
  scoreCancellation,
  scoreContactLightness,
  scoreOnsetSoftness,
  scorePace,
  scoreProlongLength,
} from '@/game-engine/speechScoring';

// Canonical 5-strategy names (matches the app-wide Strategy Switcher) plus the original
// 5 names kept as permanent aliases — every existing game already calls useSpeechMetric with
// the original names, so renaming outright would break 30+ live screens. New code should use
// the canonical names; both resolve to the exact same scoring function.
export type SpeechMetricType =
  | 'easyOnset'
  | 'onsetSoftness' // alias: easyOnset
  | 'lightContact'
  | 'contactLightness' // alias: lightContact
  | 'slowSpeech'
  | 'pace' // alias: slowSpeech
  | 'stretchySpeech'
  | 'prolongLength' // alias: stretchySpeech
  | 'cancellation';

type CanonicalSpeechMetricType = 'easyOnset' | 'lightContact' | 'slowSpeech' | 'stretchySpeech' | 'cancellation';

const LEGACY_TYPE_ALIAS: Partial<Record<SpeechMetricType, CanonicalSpeechMetricType>> = {
  onsetSoftness: 'easyOnset',
  contactLightness: 'lightContact',
  pace: 'slowSpeech',
  prolongLength: 'stretchySpeech',
};

function canonicalizeType(type: SpeechMetricType): CanonicalSpeechMetricType {
  return (LEGACY_TYPE_ALIAS[type] as CanonicalSpeechMetricType) ?? (type as CanonicalSpeechMetricType);
}

// 'prepping' and 'no-speech' are new — existing callers only ever compared against 'recording'
// (via `isRecording`) so widening this union is additive and safe.
export type SpeechMetricPhase = 'idle' | 'prepping' | 'recording' | 'scoring' | 'no-speech';

export type SpeechMetricResult = {
  score: number; // 0-100
  success: boolean;
  durationMs: number;
  /** Cancellation-only: whether a pause-then-retry pattern was actually detected. */
  pauseDetected?: boolean;
  /** True if nothing crossed the voice threshold this attempt — caller should show a warm
   * "didn't catch that" retry, not treat it as a scored failure. */
  noSpeechDetected?: boolean;
  /** True if a phone call, backgrounding, or an audio-session reset cut the attempt short. */
  interrupted?: boolean;
};

/** Score at/above this counts as a round success (Fin cheers, +XP). Below is a gentle retry. */
export const SPEECH_METRIC_SUCCESS_THRESHOLD = 60;

const DEFAULT_MAX_DURATION_MS: Record<CanonicalSpeechMetricType, number> = {
  easyOnset: 3000,
  slowSpeech: 3500,
  stretchySpeech: 4000,
  lightContact: 3000,
  cancellation: 7000,
};

const DEFAULT_BASELINE_MS = 500; // pace baseline word duration
const DEFAULT_TARGET_PROLONG_MS = 900; // prolongLength "good stretch" target

export type SpeechMetricOptions = {
  maxDurationMs?: number;
  baselineMs?: number; // pace only
  targetMs?: number; // prolongLength only
};

export function useSpeechMetric(rawType: SpeechMetricType, options: SpeechMetricOptions = {}) {
  const type = canonicalizeType(rawType);
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS[type];
  const baselineMs = options.baselineMs ?? DEFAULT_BASELINE_MS;
  const targetMs = options.targetMs ?? DEFAULT_TARGET_PROLONG_MS;
  const { baselineDb } = useMicCalibration();

  // Cancellation needs room for a real pause between two attempts — a technique that *is*
  // silence, deliberately — so it never auto-ends on trailing silence the way single-word
  // metrics do. It relies entirely on the game's own manual stop / max-duration ceiling.
  const endMode: VoiceRecorderEndMode = type === 'cancellation' ? 'manual' : 'auto';

  const recorder = useVoiceRecorder({ endMode, maxDurationMs, calibratedFloorDb: baselineDb });

  const scoreSamples = useCallback(
    (samples: Sample[]): { score: number; pauseDetected?: boolean } => {
      switch (type) {
        case 'easyOnset':
          return { score: scoreOnsetSoftness(samples) };
        case 'slowSpeech':
          return { score: scorePace(samples, baselineMs) };
        case 'stretchySpeech':
          return { score: scoreProlongLength(samples, targetMs) };
        case 'lightContact':
          return { score: scoreContactLightness(samples) };
        case 'cancellation':
          return scoreCancellation(samples);
      }
    },
    [type, baselineMs, targetMs]
  );

  const start = useCallback((): Promise<SpeechMetricResult> => {
    return recorder.start().then((raw) => {
      // Permission-denied resolves through here too (samples empty, noSpeechDetected true) —
      // harmless, since callers check `permissionDenied` before ever looking at the result.
      if (raw.noSpeechDetected) {
        return { score: 0, success: false, durationMs: raw.durationMs, noSpeechDetected: true, interrupted: raw.interrupted };
      }
      const { score, pauseDetected } = scoreSamples(raw.samples);
      return {
        score,
        success: score >= SPEECH_METRIC_SUCCESS_THRESHOLD,
        durationMs: raw.durationMs,
        ...(type === 'cancellation' ? { pauseDetected: pauseDetected ?? false } : {}),
        interrupted: raw.interrupted,
      };
    });
  }, [recorder, scoreSamples, type]);

  // Map the low-level recorder phase onto the metric-facing phase, surfacing the transient
  // no-speech state a beat before it settles back to idle.
  const phase: SpeechMetricPhase =
    recorder.phase === 'processing' ? 'scoring' : recorder.phase === 'prepping' ? 'prepping' : recorder.phase;

  return {
    phase,
    permissionDenied: recorder.permissionDenied,
    liveLevel: recorder.liveLevel,
    liveWaveform: recorder.liveWaveform,
    liveSmoothness: recorder.liveSmoothness,
    isRecording: recorder.isRecording,
    isPrepping: recorder.isPrepping,
    isProcessing: recorder.isProcessing,
    /** Starts recording and resolves with the scored result once the attempt naturally ends. */
    start,
    /** Manually ends the current recording early (e.g. user taps the mic again). Always
     * available once recording has started, regardless of the metric's end mode. */
    stop: recorder.stop,
  };
}
