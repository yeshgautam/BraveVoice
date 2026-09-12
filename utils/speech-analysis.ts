// Shared speech-analysis engine for all Little Voices games.
//
// This app runs on Expo/React Native, not native Swift — there is no AVAudioEngine
// tap into raw PCM, no SFTranscriptionSegment word timings, and no formant/plosive
// detection available. The only real-time signal exposed by expo-speech-recognition
// is a coarse `volumechange` reading (sampled every ~100ms) plus final transcripts.
// The formulas below implement the same clinical intent (gradual onset, reduced
// rate, elongated smooth vowels, soft consonant contact, structured pause-and-retry)
// as proxies built on that signal. Thresholds are reasonable starting points and may
// need tuning once measured against real device recordings.

export type FeedbackTier = 'excellent' | 'good' | 'try-again' | 'skip';
export const MAX_ATTEMPTS_PER_WORD = 3;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

export function similarityRatio(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(normA, normB) / maxLen;
}

/** Fuzzy word match: exact containment, or >=80% similarity against any word in the transcript. */
export function wordMatches(transcript: string, target: string, threshold = 0.8): boolean {
  const normTranscript = normalizeText(transcript);
  const normTarget = normalizeText(target);
  if (!normTranscript || !normTarget) return false;
  if (normTranscript.includes(normTarget) || normTarget.includes(normTranscript)) return true;
  return normTranscript.split(/\s+/).some((w) => similarityRatio(w, normTarget) >= threshold);
}

/** Vowel-group heuristic syllable estimator, matching the spec's suggested approach. */
export function estimateSyllables(word: string): number {
  const normalized = normalizeText(word).replace(/\s+/g, '');
  if (!normalized) return 1;
  const groups = normalized.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (normalized.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export function getFeedbackTier(score: number, attemptNumber: number): FeedbackTier {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score < 65 && attemptNumber >= MAX_ATTEMPTS_PER_WORD) return 'skip';
  return 'try-again';
}

export function getFeedbackMessage(tier: FeedbackTier): string {
  switch (tier) {
    case 'excellent':
      return 'Amazing! 🌟';
    case 'good':
      return 'Good try! Almost perfect! ⭐';
    case 'try-again':
      return 'You can do it! Try again! 💪';
    case 'skip':
      return "That one was tricky! Let's try the next one 🐧";
  }
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function variance(samples: number[]): number {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / samples.length;
}

/** Strategy 1 — Easy Onset: reward a gradual rise, penalize a sharp spike at word start. */
export function scoreEasyOnset(onsetSamples: number[]): { score: number; attackRate: number } {
  if (onsetSamples.length < 2) return { score: 60, attackRate: 0 };
  const first = onsetSamples[0];
  const peak = Math.max(...onsetSamples);
  const rise = Math.max(0, peak - first);
  const attackRate = rise * 10; // scaled onto a 0-100-ish "dB-like" axis
  const score = clamp(100 - Math.max(0, attackRate - 15) * 4);
  return { score, attackRate };
}

/** Strategy 2 — Slow Speech: reward words that take longer than a per-syllable baseline. */
export function scoreSlowSpeech(word: string, durationMs: number): { score: number; speechRate: number } {
  const syllables = estimateSyllables(word);
  const speechRate = syllables / Math.max(0.001, durationMs / 1000);
  const targetDurationMs = syllables * 400;
  const score = clamp((durationMs / targetDurationMs) * 100);
  return { score, speechRate };
}

/** Strategy 3 — Stretchy Speech: 70% elongation, 30% smoothness (low amplitude variance). */
export function scoreStretchySpeech(
  durationMs: number,
  amplitudeSamples: number[]
): { score: number; durationScore: number; smoothnessScore: number } {
  const targetDurationMs = 750; // midpoint of the 600-900ms spec target
  const durationScore = clamp((durationMs / targetDurationMs) * 100);
  const smoothnessScore = clamp(100 - variance(amplitudeSamples) * 8);
  const score = durationScore * 0.7 + smoothnessScore * 0.3;
  return { score, durationScore, smoothnessScore };
}

/** Strategy 4 — Light Contact: proxy for plosive burst intensity via peak-above-average. */
export function scoreLightContact(amplitudeSamples: number[]): { score: number; burstIntensity: number } {
  if (amplitudeSamples.length === 0) return { score: 100, burstIntensity: 0 };
  const avg = amplitudeSamples.reduce((a, b) => a + b, 0) / amplitudeSamples.length;
  const peak = Math.max(...amplitudeSamples);
  const burstIntensity = Math.max(0, peak - avg);
  const score = clamp(100 - burstIntensity * 20);
  return { score, burstIntensity };
}

/** Strategy 5 — Cancellations: pause portion of the 4-part rubric (target 1-3s, full credit). */
export function scoreCancellationPause(pauseDurationMs: number): number {
  if (pauseDurationMs >= 1000 && pauseDurationMs <= 3000) return 25;
  if (pauseDurationMs < 1000) return clamp(25 * (pauseDurationMs / 1000), 0, 25);
  if (pauseDurationMs <= 4000) return clamp(25 * (1 - (pauseDurationMs - 3000) / 1000), 0, 25);
  return 10;
}

/** Strategy 5 — Cancellations: retry-onset portion, reusing the Easy Onset gradual-rise model. */
export function scoreCancellationRetryOnset(onsetSamples: number[]): number {
  const { score } = scoreEasyOnset(onsetSamples);
  return (score / 100) * 25;
}

const NOISE_THRESHOLD = 8;

/** Flags a loud ambient baseline right as listening starts — before a child could plausibly have begun the word. */
export function isEnvironmentTooNoisy(onsetSamples: number[]): boolean {
  if (onsetSamples.length === 0) return false;
  const avg = onsetSamples.reduce((a, b) => a + b, 0) / onsetSamples.length;
  return avg > NOISE_THRESHOLD;
}
