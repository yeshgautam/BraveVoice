// Shared recording configuration for every voice-driven screen in the app (games, diagnostic
// assessment, daily check-in voice notes, onboarding mic calibration). Centralizing this is
// the actual fix for the old "the mic cuts a child off mid-pause" bug: every consumer used to
// pick its own silence-tolerance/poll-interval numbers, so a fix in one game never reached the
// others. Now there is exactly one place these numbers live.

import { RecordingOptions, RecordingPresets } from 'expo-audio';

/** How long the brief "get ready" beat holds before the mic actually starts listening. */
export const PREP_BEAT_MS = 500;

/**
 * How long a trailing silence must last before an attempt is considered "done talking", for
 * games that use auto end-pointing. This used to be 550ms, which was clinically wrong: a child
 * deliberately pausing mid-attempt (Cancellation's finish-pause-retry ritual, or just taking a
 * breath before a hard word) would get cut off before they ever got to the second half of the
 * technique. 2.6s tolerates a real, natural pause without making every round feel laggy for
 * kids who finish quickly. Cancellation itself uses `endMode: 'manual'` (see useSpeechMetric)
 * so it never depends on this number at all — the child (or the game) always decides when an
 * attempt is over there.
 */
export const SILENCE_TOLERANCE_MS = 2600;

export const MIC_POLL_INTERVAL_MS = 60;

/** Number of bars in the live waveform ring buffer. */
export const WAVEFORM_BAR_COUNT = 16;

/**
 * Recording preset shared by every expo-audio recorder in the app. Built on HIGH_QUALITY, with
 * one addition: on Android, `audioSource: 'voice_communication'` opts into the platform's
 * built-in echo cancellation and automatic gain control when the device supports it — real
 * noise suppression / gain normalization at the OS level, not just our own post-hoc rescaling.
 *
 * iOS has no equivalent JS-level switch in expo-audio's public API (AVAudioSession's voice-
 * processing mode isn't exposed here), so on iOS we rely on the software noise-gate + running
 * automatic-gain-normalization applied in speechScoring.ts / useVoiceRecorder instead. Worth
 * revisiting if expo-audio ever exposes AVAudioSession mode control.
 */
export const VOICE_RECORDING_PRESET: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    audioSource: 'voice_communication',
  },
};
