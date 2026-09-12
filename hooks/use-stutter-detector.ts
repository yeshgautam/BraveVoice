import { useCallback, useEffect, useRef } from 'react';

import {
  AmplitudeChangeEvent,
  ErrorEvent,
  SpeechBaseline,
  SpeechResultEvent,
  StutterDetectorNativeModule,
  StutterEvent,
  WordAttemptSummaryEvent,
} from '@/modules/stutter-detector';

export type UseStutterDetectorCallbacks = {
  onAmplitudeChange?: (event: AmplitudeChangeEvent) => void;
  onSpeechResult?: (event: SpeechResultEvent) => void;
  onStutterDetected?: (event: StutterEvent) => void;
  onWordAttemptSummary?: (event: WordAttemptSummaryEvent) => void;
  onError?: (event: ErrorEvent) => void;
};

/**
 * Wraps the native StutterDetectorModule (iOS only — real AVAudioEngine + FFT analysis).
 * On Android, or if the native module isn't linked, `isSupported` is false and every
 * method is a safe no-op so calling code doesn't need to branch everywhere.
 */
export function useStutterDetector(callbacks: UseStutterDetectorCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const isSupported = StutterDetectorNativeModule !== null;

  useEffect(() => {
    if (!StutterDetectorNativeModule) return;
    const module = StutterDetectorNativeModule;

    const subscriptions = [
      module.addListener('onAmplitudeChange', (event) => callbacksRef.current.onAmplitudeChange?.(event)),
      module.addListener('onSpeechResult', (event) => callbacksRef.current.onSpeechResult?.(event)),
      module.addListener('onStutterDetected', (event) => callbacksRef.current.onStutterDetected?.(event)),
      module.addListener('onWordAttemptSummary', (event) => callbacksRef.current.onWordAttemptSummary?.(event)),
      module.addListener('onError', (event) => callbacksRef.current.onError?.(event)),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!StutterDetectorNativeModule) return false;
    const { granted } = await StutterDetectorNativeModule.requestPermissionsAsync();
    return granted;
  }, []);

  const setTargetWord = useCallback((word: string, ageYears: number) => {
    StutterDetectorNativeModule?.setTargetWord(word, ageYears);
  }, []);

  const setChildBaseline = useCallback((baseline: SpeechBaseline | null) => {
    StutterDetectorNativeModule?.setChildBaseline(baseline);
  }, []);

  const startListening = useCallback(() => {
    StutterDetectorNativeModule?.startListening();
  }, []);

  const stopListening = useCallback(() => {
    StutterDetectorNativeModule?.stopListening();
  }, []);

  return { isSupported, requestPermissions, setTargetWord, setChildBaseline, startListening, stopListening };
}
