// Pure, hookless amplitude-envelope scoring math shared by every recording pipeline in the
// app: useSpeechMetric (8+ mode + Tic-Tac-Toe + diagnostic bonus pass), useDiagnosticRecording
// (baseline disfluency-flag pass), and pulse-word-game (young-mode games' technique scoring on
// top of their ASR word-match). Centralized here so all three score the same amplitude signal
// the same way instead of maintaining three forked copies of "what does a soft onset look like".
//
// IMPORTANT: This is a simplified gameplay-feedback proxy, not clinical-grade stutter or
// fluency detection. It scores a single mic recording's amplitude-over-time envelope (in
// normalized 0-1 "level", itself derived from expo-audio dBFS metering or expo-speech-
// recognition's volumechange signal) using cheap heuristics chosen to *feel* right during
// play. None of this is validated against a clinical fluency measure.

export type RawSample = { t: number; db: number }; // raw dBFS metering reading, t = ms since start
export type Sample = { t: number; level: number }; // level normalized 0-1, t = ms since start

export const VOICE_THRESHOLD = 0.12;
export const BURST_GAP_MS = 350;
export const SMOOTHNESS_WINDOW = 5; // recent samples considered for the live jerkiness readout
export const SMOOTHNESS_SCALE = 3; // per-tick level delta that fully zeroes out liveSmoothness

// dBFS range expo-audio's metering reports for a device mic: true silence floors out around
// -50 to -60, and normal conversational speech at arm's length typically reads -35 to -15 —
// nowhere close to "shouting into the mic" (-6 or louder). The live-feedback ceiling below is
// deliberately generous so a normal speaking voice actually registers.
export const SILENCE_DB = -50;
export const LOUD_DB = -18;

// Scoring recalibrates per-attempt against the room's own noise floor and how loud this
// specific attempt actually got, rather than trusting fixed absolute dB anchors — a device
// mic's sensitivity and a child's speaking volume vary too much for one static range to
// reliably tell "spoke softly" apart from "mic barely picked anything up". This is our
// automatic-gain-normalization layer: every attempt is rescaled against its own ambient floor
// and peak, so background noise level and a quiet vs. loud kid don't unfairly skew the score.
export const AMBIENT_SAMPLE_WINDOW_MS = 200;
export const AMBIENT_MARGIN_DB = 8;

export function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function normalizeDb(db: number | undefined, silenceDb: number = SILENCE_DB, loudDb: number = LOUD_DB): number {
  if (db === undefined || !Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db - silenceDb) / (loudDb - silenceDb)));
}

/**
 * Rescales raw dB samples against this attempt's own ambient floor and peak volume (automatic
 * gain normalization), then applies a soft noise gate: anything within the ambient margin is
 * floored to 0 so background hiss/hum doesn't register as "voiced". Optional `calibratedFloorDb`
 * seeds the ambient estimate from the onboarding mic-check baseline instead of this attempt's
 * own first 200ms, which matters for short attempts that don't have much of a lead-in.
 */
export function calibrateSamples(samples: RawSample[], calibratedFloorDb?: number): Sample[] {
  if (samples.length === 0) return [];
  const ambientSamples = samples.filter((s) => s.t <= AMBIENT_SAMPLE_WINDOW_MS);
  const attemptAmbientDb =
    ambientSamples.length > 0 ? ambientSamples.reduce((sum, s) => sum + s.db, 0) / ambientSamples.length : SILENCE_DB;
  const ambientDb = calibratedFloorDb !== undefined ? Math.max(calibratedFloorDb, attemptAmbientDb) : attemptAmbientDb;
  const effectiveSilenceDb = Math.max(SILENCE_DB, ambientDb) + AMBIENT_MARGIN_DB;
  const peakDb = Math.max(...samples.map((s) => s.db));
  const effectiveLoudDb = Math.max(effectiveSilenceDb + 4, Math.min(LOUD_DB, peakDb));
  return samples.map((s) => ({ t: s.t, level: normalizeDb(s.db, effectiveSilenceDb, effectiveLoudDb) }));
}

export function findOnsetIndex(samples: Sample[]): number {
  return samples.findIndex((s) => s.level > VOICE_THRESHOLD);
}

export function segmentVoicedBursts(samples: Sample[], gapMs: number = BURST_GAP_MS): { start: number; end: number }[] {
  const bursts: { start: number; end: number }[] = [];
  let curStart: number | null = null;
  let lastVoicedT: number | null = null;
  for (const s of samples) {
    if (s.level > VOICE_THRESHOLD) {
      if (curStart === null) curStart = s.t;
      lastVoicedT = s.t;
    } else if (curStart !== null && lastVoicedT !== null && s.t - lastVoicedT > gapMs) {
      bursts.push({ start: curStart, end: lastVoicedT });
      curStart = null;
      lastVoicedT = null;
    }
  }
  if (curStart !== null && lastVoicedT !== null) bursts.push({ start: curStart, end: lastVoicedT });
  return bursts;
}

/** Onset softness: a gradual rise scores high, a sudden spike scores low. */
export function scoreOnsetSoftness(samples: Sample[]): number {
  const onsetIdx = findOnsetIndex(samples);
  if (onsetIdx === -1) return 0;
  const windowEnd = samples[onsetIdx].t + 260;
  let maxDelta = 0;
  for (let i = onsetIdx + 1; i < samples.length && samples[i].t <= windowEnd; i++) {
    const delta = samples[i].level - samples[i - 1].level;
    if (delta > maxDelta) maxDelta = delta;
  }
  return clamp100(100 - maxDelta * 260);
}

/** Pace: total voiced duration vs. a baseline — slower (longer) scores higher. */
export function scorePace(samples: Sample[], baselineMs: number): number {
  const bursts = segmentVoicedBursts(samples);
  if (bursts.length === 0) return 0;
  const longest = bursts.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const durationMs = longest.end - longest.start;
  return clamp100((durationMs / baselineMs) * 100);
}

/** Prolong length: how long the initial sound is held above threshold before the first drop. */
export function scoreProlongLength(samples: Sample[], targetMs: number): number {
  const onsetIdx = findOnsetIndex(samples);
  if (onsetIdx === -1) return 0;
  const onsetT = samples[onsetIdx].t;
  let endT = onsetT;
  for (let i = onsetIdx; i < samples.length; i++) {
    if (samples[i].level > VOICE_THRESHOLD * 0.7) endT = samples[i].t;
    else break;
  }
  return clamp100(((endT - onsetT) / targetMs) * 100);
}

/** Contact lightness: peak-vs-average amplitude — spikier (harder contact) scores lower. */
export function scoreContactLightness(samples: Sample[]): number {
  const voiced = samples.filter((s) => s.level > VOICE_THRESHOLD);
  if (voiced.length === 0) return 100;
  const peak = Math.max(...voiced.map((s) => s.level));
  const avg = voiced.reduce((sum, s) => sum + s.level, 0) / voiced.length;
  return clamp100(100 - Math.max(0, peak - avg) * 220);
}

export function scorePauseGap(pauseMs: number): number {
  if (pauseMs >= 500 && pauseMs <= 3000) return 40;
  if (pauseMs < 500) return clamp100(40 * (pauseMs / 500)) * 0.4;
  if (pauseMs <= 4500) return 40 * (1 - (pauseMs - 3000) / 1500);
  return 15;
}

/**
 * Cancellation: detects a first attempt, a pause gap, then a second (retry) attempt, and
 * scores the pause length plus how smooth the retry's onset was. A single fluent burst
 * (no stutter to begin with) is treated as a win too — the ritual is a tool, not a requirement.
 */
export function scoreCancellation(samples: Sample[]): { score: number; pauseDetected: boolean } {
  const bursts = segmentVoicedBursts(samples);
  if (bursts.length === 0) return { score: 0, pauseDetected: false };
  if (bursts.length === 1) return { score: 88, pauseDetected: false };

  const first = bursts[0];
  const second = bursts[1];
  const pauseMs = second.start - first.end;
  const pauseScore = scorePauseGap(pauseMs);

  const secondBurstSamples = samples
    .filter((s) => s.t >= second.start - 40)
    .map((s) => ({ t: s.t - (second.start - 40), level: s.level }));
  const onsetScore = scoreOnsetSoftness(secondBurstSamples);

  return { score: clamp100(pauseScore + onsetScore * 0.6), pauseDetected: true };
}
