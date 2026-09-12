// Shared low-level recording engine for every expo-audio-based mic screen in the app:
// useSpeechMetric (technique scoring), useDiagnosticRecording (disfluency-flag baseline pass),
// the daily check-in voice note, and the onboarding mic calibration check. This is the one
// place that owns the actual recording lifecycle, silence tolerance, live waveform, and
// interruption safety — callers only supply scoring logic on top of the calibrated samples it
// hands back.
//
// Recording lifecycle: idle -> prepping (brief "get ready" beat) -> recording -> processing ->
// idle. Manual stop is always available once recording has started, regardless of `endMode`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { MIC_POLL_INTERVAL_MS, PREP_BEAT_MS, SILENCE_TOLERANCE_MS, VOICE_RECORDING_PRESET, WAVEFORM_BAR_COUNT } from '@/game-engine/audioRecordingConfig';
import {
  AMBIENT_SAMPLE_WINDOW_MS,
  LOUD_DB,
  RawSample,
  Sample,
  SILENCE_DB,
  VOICE_THRESHOLD,
  calibrateSamples,
  normalizeDb,
} from '@/game-engine/speechScoring';

export type VoiceRecorderPhase = 'idle' | 'prepping' | 'recording' | 'processing';

/**
 * How an attempt ends:
 * - 'auto': ends after `silenceToleranceMs` of trailing silence (long by default — see
 *   audioRecordingConfig.ts for why), or `maxDurationMs` as an absolute safety net.
 * - 'manual': only ends on an explicit `stop()` call or the `maxDurationMs` safety net. No
 *   silence-based auto-cutoff at all — for techniques like Cancellation where mid-attempt
 *   silence is deliberate, correct technique, not "done talking".
 * - 'fixedDuration': records for exactly `maxDurationMs`; behaves like 'manual' at the engine
 *   level (no early silence cutoff) but signals caller intent that the full duration is the
 *   expected shape of the attempt.
 */
export type VoiceRecorderEndMode = 'auto' | 'manual' | 'fixedDuration';

export type VoiceRecorderOptions = {
  endMode?: VoiceRecorderEndMode;
  /** Only used when endMode is 'auto'. Defaults to the shared long tolerance. */
  silenceToleranceMs?: number;
  /** Absolute safety-net ceiling regardless of endMode. */
  maxDurationMs?: number;
  prepBeatMs?: number;
  /** Ambient dB floor from the onboarding mic-check baseline, if calibrated for this device. */
  calibratedFloorDb?: number;
};

export type VoiceRecorderResult = {
  samples: Sample[];
  durationMs: number;
  /** True if the whole attempt never crossed the voice threshold — nothing to score. */
  noSpeechDetected: boolean;
  /** True if the attempt was cut short by a phone call, backgrounding, or an audio-session
   * reset rather than ending naturally — caller should offer a neutral retry, not a low score. */
  interrupted: boolean;
  /** This attempt's own ambient-floor dB reading (averaged from its first ~200ms). The
   * onboarding mic check stores this as the device's calibration baseline for every future
   * attempt to seed against, via `calibratedFloorDb`. */
  ambientFloorDb: number;
};

const DEFAULT_MAX_DURATION_MS = 6000;

export function useVoiceRecorder(options: VoiceRecorderOptions = {}) {
  const endMode = options.endMode ?? 'auto';
  const silenceToleranceMs = options.silenceToleranceMs ?? SILENCE_TOLERANCE_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const prepBeatMs = options.prepBeatMs ?? PREP_BEAT_MS;
  const calibratedFloorDb = options.calibratedFloorDb;

  const recorder = useAudioRecorder(VOICE_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(recorder, MIC_POLL_INTERVAL_MS);

  const [phase, setPhase] = useState<VoiceRecorderPhase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const liveLevel = useSharedValue(0);
  const liveWaveform = useSharedValue<number[]>(Array(WAVEFORM_BAR_COUNT).fill(0));
  // 1 = perfectly smooth control so far this attempt, 0 = a sharp jerk just happened.
  const liveSmoothness = useSharedValue(1);
  const recentLevelsRef = useRef<number[]>([]);

  const samplesRef = useRef<RawSample[]>([]);
  const startedAtRef = useRef(0);
  const hasVoicedRef = useRef(false);
  const lastVoicedAtRef = useRef<number | null>(null);
  const resolveRef = useRef<((result: VoiceRecorderResult) => void) | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingActiveRef = useRef(false);
  const preppingRef = useRef(false);
  // Adaptive live-meter range: seeded from the calibrated baseline (if any), then ratchets its
  // ceiling upward as louder samples arrive this attempt — automatic gain normalization applied
  // live, not just retroactively at scoring time.
  const silenceFloorRef = useRef(SILENCE_DB);
  const loudCeilingRef = useRef(LOUD_DB);

  const clearTimers = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (endpointTimerRef.current) {
      clearTimeout(endpointTimerRef.current);
      endpointTimerRef.current = null;
    }
    if (prepTimerRef.current) {
      clearTimeout(prepTimerRef.current);
      prepTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(
    async (interrupted = false) => {
      if (!recordingActiveRef.current) return;
      recordingActiveRef.current = false;
      clearTimers();

      setPhase('processing');
      try {
        await recorder.stop();
      } catch {
        // A stop-while-not-recording race, or the audio session was already torn down by an
        // interruption — harmless either way, scoring proceeds on whatever we sampled.
      }

      const durationMs = Date.now() - startedAtRef.current;
      const samples = calibrateSamples(samplesRef.current, calibratedFloorDb);
      const ambientRaw = samplesRef.current.filter((s) => s.t <= AMBIENT_SAMPLE_WINDOW_MS);
      const ambientFloorDb =
        ambientRaw.length > 0 ? ambientRaw.reduce((sum, s) => sum + s.db, 0) / ambientRaw.length : SILENCE_DB;
      const result: VoiceRecorderResult = {
        samples,
        durationMs,
        ambientFloorDb,
        noSpeechDetected: !hasVoicedRef.current,
        interrupted,
      };

      liveLevel.value = withTiming(0, { duration: 150 });
      liveSmoothness.value = withTiming(1, { duration: 150 });
      liveWaveform.value = Array(WAVEFORM_BAR_COUNT).fill(0);
      setPhase('idle');
      resolveRef.current?.(result);
      resolveRef.current = null;
    },
    [recorder, calibratedFloorDb, clearTimers, liveLevel, liveSmoothness, liveWaveform]
  );

  // Interruption during the pre-record "get ready" beat — recording never actually started, so
  // there's nothing for `finish()` to tear down. Cancel the beat outright and resolve the
  // caller's promise so an awaited `start()` never hangs.
  const abortPrepping = useCallback(
    (interrupted: boolean) => {
      if (!preppingRef.current) return;
      preppingRef.current = false;
      clearTimers();
      setPhase('idle');
      resolveRef.current?.({ samples: [], durationMs: 0, ambientFloorDb: SILENCE_DB, noSpeechDetected: true, interrupted });
      resolveRef.current = null;
    },
    [clearTimers]
  );

  // Poll tick: append a raw sample, drive live visuals (with live AGC + a soft noise gate), and
  // manage silence-based auto end-pointing when endMode is 'auto'.
  useEffect(() => {
    if (!recordingActiveRef.current) return;
    const db = recorderState.metering;
    if (db !== undefined && db > loudCeilingRef.current) {
      // Cap how far a single loud spike can blow out the range, so one shout doesn't flatten
      // the rest of the attempt's visual feedback.
      loudCeilingRef.current = Math.min(LOUD_DB + 12, db);
    }
    const level = normalizeDb(db, silenceFloorRef.current, loudCeilingRef.current);
    const t = Date.now() - startedAtRef.current;
    samplesRef.current.push({ t, db: db ?? SILENCE_DB });

    liveLevel.value = withTiming(level, { duration: MIC_POLL_INTERVAL_MS * 1.4 });
    // Soft noise gate on the visual waveform only — near-floor jitter reads as flat silence
    // instead of wiggling, without touching the raw samples scoring runs against.
    const gatedLevel = level < 0.05 ? 0 : level;
    liveWaveform.value = [...liveWaveform.value.slice(1), gatedLevel];

    const recent = recentLevelsRef.current;
    recent.push(level);
    if (recent.length > 5) recent.shift();
    let maxDelta = 0;
    for (let i = 1; i < recent.length; i++) {
      const delta = Math.abs(recent[i] - recent[i - 1]);
      if (delta > maxDelta) maxDelta = delta;
    }
    const smoothness = Math.max(0, Math.min(1, 1 - maxDelta * 3));
    liveSmoothness.value = withTiming(smoothness, { duration: MIC_POLL_INTERVAL_MS * 1.4 });

    if (level > VOICE_THRESHOLD) {
      hasVoicedRef.current = true;
      lastVoicedAtRef.current = t;
      if (endpointTimerRef.current) {
        clearTimeout(endpointTimerRef.current);
        endpointTimerRef.current = null;
      }
    } else if (endMode === 'auto' && hasVoicedRef.current && !endpointTimerRef.current) {
      endpointTimerRef.current = setTimeout(() => {
        finish(false);
      }, silenceToleranceMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.metering]);

  // iOS surfaces a system-level audio interruption (phone call, Siri, alarm) or route change by
  // resetting media services — never let that crash the app or hang the caller's awaited promise.
  useEffect(() => {
    if (!recorderState.mediaServicesDidReset) return;
    if (recordingActiveRef.current) finish(true);
    else if (preppingRef.current) abortPrepping(true);
  }, [recorderState.mediaServicesDidReset, finish, abortPrepping]);

  // Backgrounding mid-attempt (a call comes in, the child switches apps) should pause cleanly,
  // not silently keep "recording" into the void or leave the caller's promise unresolved.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      if (recordingActiveRef.current) finish(true);
      else if (preppingRef.current) abortPrepping(true);
    });
    return () => sub.remove();
  }, [finish, abortPrepping]);

  const start = useCallback((): Promise<VoiceRecorderResult> => {
    return new Promise((resolve) => {
      if (recordingActiveRef.current || preppingRef.current) {
        // Already mid-attempt; ignore a stray double-start rather than clobbering state.
        return;
      }

      (async () => {
        let granted = false;
        try {
          const res = await requestRecordingPermissionsAsync();
          granted = res.granted;
        } catch {
          granted = false;
        }
        if (!granted) {
          setPermissionDenied(true);
          resolve({ samples: [], durationMs: 0, ambientFloorDb: SILENCE_DB, noSpeechDetected: true, interrupted: false });
          return;
        }
        setPermissionDenied(false);

        try {
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        } catch {
          // Non-fatal — recording can still proceed on most devices even if the mode call races.
        }

        samplesRef.current = [];
        recentLevelsRef.current = [];
        hasVoicedRef.current = false;
        lastVoicedAtRef.current = null;
        silenceFloorRef.current = calibratedFloorDb !== undefined ? Math.max(SILENCE_DB, calibratedFloorDb) + 8 : SILENCE_DB;
        loudCeilingRef.current = LOUD_DB;
        resolveRef.current = resolve;
        preppingRef.current = true;
        setPhase('prepping');

        try {
          await recorder.prepareToRecordAsync();
        } catch {
          preppingRef.current = false;
          setPhase('idle');
          resolve({ samples: [], durationMs: 0, ambientFloorDb: SILENCE_DB, noSpeechDetected: true, interrupted: true });
          resolveRef.current = null;
          return;
        }

        prepTimerRef.current = setTimeout(() => {
          prepTimerRef.current = null;
          if (!preppingRef.current) return; // interrupted/backgrounded during the beat
          preppingRef.current = false;
          try {
            startedAtRef.current = Date.now();
            recordingActiveRef.current = true;
            setPhase('recording');
            recorder.record();
          } catch {
            recordingActiveRef.current = false;
            setPhase('idle');
            resolve({ samples: [], durationMs: 0, ambientFloorDb: SILENCE_DB, noSpeechDetected: true, interrupted: true });
            resolveRef.current = null;
            return;
          }

          maxTimerRef.current = setTimeout(() => {
            finish(false);
          }, maxDurationMs);
        }, prepBeatMs);
      })();
    });
  }, [recorder, finish, maxDurationMs, prepBeatMs, calibratedFloorDb]);

  /** Manually ends the current recording early. Always available once recording has started. */
  const stop = useCallback(() => {
    finish(false);
  }, [finish]);

  useEffect(() => {
    return () => {
      clearTimers();
      preppingRef.current = false;
      if (recordingActiveRef.current) {
        recordingActiveRef.current = false;
        recorder.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phase,
    permissionDenied,
    liveLevel: liveLevel as SharedValue<number>,
    liveWaveform: liveWaveform as SharedValue<number[]>,
    liveSmoothness: liveSmoothness as SharedValue<number>,
    isRecording: phase === 'recording',
    isPrepping: phase === 'prepping',
    isProcessing: phase === 'processing',
    start,
    stop,
  };
}
