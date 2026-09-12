// Shared mic-permission flow for every speech-driven game and the diagnostic assessment.
//
// Three explicit states a caller can render around:
//   'not-asked'  — never prompted yet (or the OS permission was reset). Show the friendly
//                  pre-permission explanation before calling `requestPermission()`, so the
//                  child/parent understands *why* the mic is needed before the OS dialog
//                  (which a child can't customize) appears.
//   'granted'    — mic is available, go ahead and record.
//   'denied'     — user said no. iOS/Android won't show the system dialog again, so the only
//                  path forward is `openSettings()` — always offer that instead of re-prompting.
//
// Pass `includeSpeechRecognition: true` for young-mode games (pulse-word-game), which need
// speech-recognition permission in addition to plain mic access — expo-speech-recognition's
// combined request/check covers both in one OS prompt so the child only sees one dialog.

import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

export type MicPermissionState = 'checking' | 'not-asked' | 'granted' | 'denied';

export function useMicPermissions(options: { includeSpeechRecognition?: boolean } = {}) {
  const { includeSpeechRecognition = false } = options;
  const [state, setState] = useState<MicPermissionState>('checking');

  const refresh = useCallback(async () => {
    const { status, canAskAgain } = includeSpeechRecognition
      ? await ExpoSpeechRecognitionModule.getPermissionsAsync()
      : await getRecordingPermissionsAsync();
    if (status === 'granted') {
      setState('granted');
    } else if (status === 'denied' && !canAskAgain) {
      setState('denied');
    } else {
      setState('not-asked');
    }
  }, [includeSpeechRecognition]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Shows the OS permission dialog. Call only after the child has seen the friendly explanation. */
  const requestPermission = useCallback(async () => {
    const { granted, canAskAgain } = includeSpeechRecognition
      ? await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      : await requestRecordingPermissionsAsync();
    if (granted) {
      setState('granted');
    } else {
      setState(canAskAgain ? 'not-asked' : 'denied');
    }
    return granted;
  }, [includeSpeechRecognition]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { state, requestPermission, openSettings, refresh };
}
