// Fixed baseline word list for the Sound Diagnostic Assessment (Phase 10), tagged by
// initial-sound category so results can be broken down by which sound classes gave the most
// trouble — not a clinical instrument, a pattern snapshot for the therapist to act on.
//
// NOTE: the spec text says "24-word list" but the six category lists it provides add up to
// 26 words (Plosives alone lists 6, not 4). Kept all 26 exactly as specified rather than
// guessing which 2 to cut — flag this discrepancy if 24 was actually intended.

export type SoundCategory = 'plosives' | 'fricatives' | 'nasals' | 'vowelInitial' | 'blends' | 'liquids';

export const SOUND_CATEGORY_LABEL: Record<SoundCategory, string> = {
  plosives: 'Plosives',
  fricatives: 'Fricatives',
  nasals: 'Nasals',
  vowelInitial: 'Vowel-initial',
  blends: 'Blends',
  liquids: 'Liquids',
};

export const SOUND_CATEGORY_HINT: Record<SoundCategory, string> = {
  plosives: 'p/b/t/d/k/g — typically hardest onset',
  fricatives: 's/f/v/sh',
  nasals: 'm/n',
  vowelInitial: 'typically easiest',
  blends: 'str/tr/sn/cl — typically hardest',
  liquids: 'l/r',
};

export type DiagnosticWord = { word: string; category: SoundCategory };

export const DIAGNOSTIC_WORDS: DiagnosticWord[] = [
  { word: 'pencil', category: 'plosives' },
  { word: 'ball', category: 'plosives' },
  { word: 'table', category: 'plosives' },
  { word: 'dog', category: 'plosives' },
  { word: 'cat', category: 'plosives' },
  { word: 'girl', category: 'plosives' },

  { word: 'sun', category: 'fricatives' },
  { word: 'fish', category: 'fricatives' },
  { word: 'van', category: 'fricatives' },
  { word: 'shoe', category: 'fricatives' },

  { word: 'mouse', category: 'nasals' },
  { word: 'nose', category: 'nasals' },
  { word: 'moon', category: 'nasals' },
  { word: 'nest', category: 'nasals' },

  { word: 'apple', category: 'vowelInitial' },
  { word: 'umbrella', category: 'vowelInitial' },
  { word: 'elephant', category: 'vowelInitial' },
  { word: 'ice cream', category: 'vowelInitial' },

  { word: 'star', category: 'blends' },
  { word: 'tree', category: 'blends' },
  { word: 'snake', category: 'blends' },
  { word: 'cloud', category: 'blends' },

  { word: 'lion', category: 'liquids' },
  { word: 'rabbit', category: 'liquids' },
  { word: 'lamp', category: 'liquids' },
  { word: 'rain', category: 'liquids' },
];

export const SOUND_CATEGORIES: SoundCategory[] = ['plosives', 'fricatives', 'nasals', 'vowelInitial', 'blends', 'liquids'];
