// Practice content organized by real SLP progression tiers: single words are the easiest
// carry-over level, then a fixed carrier phrase, then full sentences, then open-ended
// connected speech. Every game pulls its target content from whichever tier is currently
// selected (see contexts/strategy-context.tsx) via getPracticeContent(tier).

import { DifficultyTier } from '@/contexts/strategy-context';
import { CHECK_IN_QUESTIONS } from '@/content/checkInQuestions';

export const WORD_LEVEL: string[] = [
  'rainbow',
  'house',
  'hamburger',
  'bounce',
  'parrot',
  'lemons',
  'shirt',
  'zipper',
  'fan',
  'summer',
  'garden',
  'corn',
];

export const PHRASE_CARRIER = 'I bought a';

export const PHRASE_LEVEL_WORDS: string[] = [
  'turkey',
  'soda',
  'magazine',
  'candy bar',
  'coffee',
  'skirt',
  'map',
  'banana',
  'ticket',
  'pen',
  'couch',
  'hot dog',
];

export const PHRASE_LEVEL: string[] = PHRASE_LEVEL_WORDS.map((w) => `${PHRASE_CARRIER} ${w}`);

// One natural short sentence per word-level target, so the same 12 sounds/words carry
// through from single-word all the way to full-sentence practice.
export const SENTENCE_LEVEL: string[] = [
  'I saw a rainbow after the rain.',
  'We live in a small house.',
  'She made a big hamburger for lunch.',
  'The ball started to bounce down the hill.',
  'The parrot can say my name.',
  'Grandma put lemons in the water.',
  'He put on a clean shirt.',
  'The zipper got stuck on my coat.',
  'Turn on the fan, it is hot in here.',
  'I love swimming in the summer.',
  'We planted carrots in the garden.',
  'The farmer grew corn all summer.',
];

// Connected-speech practice uses the same open-ended topics as the daily check-in — real
// extended talking, not a scored drill.
export const CONNECTED_SPEECH_TOPICS: string[] = CHECK_IN_QUESTIONS;

export type PracticeContent = {
  tier: DifficultyTier;
  /** Scored round targets (word/phrase/sentence tiers). Empty for connectedSpeech, which is
   * open-ended and unscored — use `topics` instead. */
  items: string[];
  /** Only populated for connectedSpeech. */
  topics?: string[];
};

export function getPracticeContent(tier: DifficultyTier): PracticeContent {
  switch (tier) {
    case 'word':
      return { tier, items: WORD_LEVEL };
    case 'phrase':
      return { tier, items: PHRASE_LEVEL };
    case 'sentence':
      return { tier, items: SENTENCE_LEVEL };
    case 'connectedSpeech':
      return { tier, items: [], topics: CONNECTED_SPEECH_TOPICS };
  }
}

/** Picks `count` targets for one round set, cycling through the tier's list if `count` exceeds it. */
export function pickPracticeItems(tier: DifficultyTier, count: number): string[] {
  const { items } = getPracticeContent(tier);
  if (items.length === 0) return [];
  return Array.from({ length: count }, (_, i) => items[i % items.length]);
}
