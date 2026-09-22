import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export type MicPermission = 'unknown' | 'granted' | 'denied';

/** Metering is reported in dBFS. Quiet room ≈ -50, a child speaking up ≈ -18. */
const FLOOR_DB = -52;
const CEIL_DB = -14;

export function dbToLevel(db: number | undefined): number {
  if (db === undefined || Number.isNaN(db)) return 0;
  return Math.max(0, Math.min(1, (db - FLOOR_DB) / (CEIL_DB - FLOOR_DB)));
}

/**
 * Wraps expo-audio recording into a simple "is the child making voice, and how
 * loud" signal. It is a voicing meter, not speech recognition: it rewards a
 * clear, sustained attempt rather than checking the word was said correctly.
 */
export function useVoiceMeter() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const status = useAudioRecorderState(recorder, 100);
  const [permission, setPermission] = useState<MicPermission>('unknown');
  const [level, setLevel] = useState(0);
  const smoothed = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const res = await AudioModule.requestRecordingPermissionsAsync();
        if (!mounted.current) return;
        setPermission(res.granted ? 'granted' : 'denied');
        if (res.granted) {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
            interruptionMode: 'duckOthers',
            shouldPlayInBackground: false,
            shouldRouteThroughEarpiece: false,
          });
        }
      } catch {
        if (mounted.current) setPermission('denied');
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const raw = dbToLevel(status.metering);
    smoothed.current = smoothed.current + (raw - smoothed.current) * 0.45;
    setLevel(status.isRecording ? smoothed.current : 0);
  }, [status.metering, status.isRecording]);

  const start = useCallback(async () => {
    if (permission !== 'granted') return false;
    try {
      await recorder.prepareToRecordAsync({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
      recorder.record();
      return true;
    } catch {
      return false;
    }
  }, [permission, recorder]);

  const stop = useCallback(async () => {
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {
      // A stop on an already-stopped recorder is harmless.
    }
    smoothed.current = 0;
    setLevel(0);
  }, [recorder]);

  useEffect(
    () => () => {
      if (recorder.isRecording) recorder.stop().catch(() => undefined);
    },
    [recorder],
  );

  return { permission, level, isRecording: status.isRecording, start, stop };
}
