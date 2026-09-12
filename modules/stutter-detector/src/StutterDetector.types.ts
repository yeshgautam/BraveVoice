export type StutterType = 'none' | 'repetition' | 'prolongation' | 'block';

export type StutterEvent = {
  type: StutterType;
  startTime: number;
  duration: number;
  /** 0.0 (barely) - 1.0 (severe) */
  severity: number;
  wordAttempted: string;
  recoveredSmoothly: boolean;
};

export type SpeechResultEvent = {
  transcript: string;
  isFinal: boolean;
};

export type AmplitudeChangeEvent = {
  /** Roughly dB — see StutterDetectionEngine's RMS-to-dB conversion. */
  amplitude: number;
};

export type WordAttemptSummaryEvent = {
  averageAmplitude: number;
  durationMs: number;
};

export type ErrorEvent = {
  message: string;
};

export type SpeechBaseline = {
  naturalSpeechRate: number;
  naturalAmplitude: number;
  naturalOnsetRate: number;
};

export type StutterDetectorEvents = {
  onAmplitudeChange: (event: AmplitudeChangeEvent) => void;
  onSpeechResult: (event: SpeechResultEvent) => void;
  onStutterDetected: (event: StutterEvent) => void;
  onWordAttemptSummary: (event: WordAttemptSummaryEvent) => void;
  onError: (event: ErrorEvent) => void;
};
