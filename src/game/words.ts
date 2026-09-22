/**
 * Speech-therapy content. Each station drills one target sound; the words are
 * ordered easiest-first so a 4-year-old meets a short word before a blend.
 */
export type WordCard = {
  word: string;
  emoji: string;
  hint: string;
  /** Seconds of voicing the child should sustain for a confident attempt. */
  holdSeconds: number;
};

export type SoundSet = {
  id: string;
  /** Short label shown on the station sign, e.g. "S". */
  sound: string;
  title: string;
  coach: string;
  words: WordCard[];
};

export const SOUND_SETS: SoundSet[] = [
  {
    id: 'sss',
    sound: 'S',
    title: 'Snake Sounds',
    coach: 'Keep your teeth together and let the air hiss out like a snake.',
    words: [
      { word: 'sun', emoji: '☀️', hint: 'Ssss-un. Long hiss, then "un".', holdSeconds: 0.9 },
      { word: 'sock', emoji: '🧦', hint: 'Ssss-ock. Feel the air on your teeth.', holdSeconds: 0.9 },
      { word: 'star', emoji: '⭐', hint: 'Sss-tar. Two sounds, one breath.', holdSeconds: 1.1 },
      { word: 'snow', emoji: '❄️', hint: 'Sss-now. Slow and smooth.', holdSeconds: 1.1 },
    ],
  },
  {
    id: 'rrr',
    sound: 'R',
    title: 'Rumble Rock',
    coach: 'Curl the back of your tongue up and growl like a friendly bear.',
    words: [
      { word: 'red', emoji: '🔴', hint: 'Rrr-ed. Growl first.', holdSeconds: 0.9 },
      { word: 'rain', emoji: '🌧️', hint: 'Rrr-ain. Keep the growl going.', holdSeconds: 1.0 },
      { word: 'robot', emoji: '🤖', hint: 'Rrr-o-bot. Three little beats.', holdSeconds: 1.2 },
      { word: 'river', emoji: '🏞️', hint: 'Rrr-i-ver. Two growls!', holdSeconds: 1.2 },
    ],
  },
  {
    id: 'lll',
    sound: 'L',
    title: 'Lantern Light',
    coach: 'Touch your tongue tip behind your top teeth and sing "la".',
    words: [
      { word: 'light', emoji: '💡', hint: 'Lll-ight. Tongue up first.', holdSeconds: 0.9 },
      { word: 'leaf', emoji: '🍃', hint: 'Lll-eaf. Hold the L.', holdSeconds: 1.0 },
      { word: 'lion', emoji: '🦁', hint: 'Lll-i-on. Big brave voice.', holdSeconds: 1.1 },
      { word: 'lemon', emoji: '🍋', hint: 'Lll-e-mon. Smooth and slow.', holdSeconds: 1.2 },
    ],
  },
  {
    id: 'kkk',
    sound: 'K',
    title: 'Crystal Clicks',
    coach: 'Pop the back of your tongue off the roof of your mouth: k! k! k!',
    words: [
      { word: 'cat', emoji: '🐈', hint: 'K-at. Sharp little pop.', holdSeconds: 0.7 },
      { word: 'key', emoji: '🔑', hint: 'K-ey. Pop then sing.', holdSeconds: 0.8 },
      { word: 'cake', emoji: '🎂', hint: 'K-ake. A pop at each end.', holdSeconds: 0.9 },
      { word: 'crown', emoji: '👑', hint: 'K-rown. Pop, growl, go.', holdSeconds: 1.0 },
    ],
  },
  {
    id: 'shh',
    sound: 'SH',
    title: 'Quiet Grove',
    coach: 'Round your lips like a kiss and whisper a long shhhh.',
    words: [
      { word: 'ship', emoji: '🚢', hint: 'Shhh-ip. Round lips.', holdSeconds: 0.9 },
      { word: 'shoe', emoji: '👟', hint: 'Shhh-oe. Long and soft.', holdSeconds: 1.0 },
      { word: 'sheep', emoji: '🐑', hint: 'Shhh-eep. Hold it out.', holdSeconds: 1.1 },
      { word: 'shell', emoji: '🐚', hint: 'Shhh-ell. Finish with L.', holdSeconds: 1.1 },
    ],
  },
];
