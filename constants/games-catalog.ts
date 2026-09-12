import { CategoryKey } from '@/contexts/progress-context';

export type GameCatalogEntry = {
  key: string;
  title: string;
  badge: number;
  /** 2-3 sentence kid-friendly mechanic explanation, shown on the Game Detail screen. */
  howToPlay: string;
};

export const GAME_CATALOG: Record<CategoryKey, GameCatalogEntry[]> = {
  'stretchy-speech': [
    {
      key: 'rainbow-stretch',
      title: 'Rainbow Stretch',
      badge: require('@/assets/images/badge-rainbow-stretch.png'),
      howToPlay: 'Stretch the word out long and smooth to paint the rainbow across the sky.',
    },
    {
      key: 'balloon-blow',
      title: 'Balloon Blow',
      badge: require('@/assets/images/badge-balloon-blow.png'),
      howToPlay: 'Stretch your words out to blow the balloon up bigger and bigger.',
    },
    {
      key: 'ocean-pull',
      title: 'Ocean Pull',
      badge: require('@/assets/images/badge-ocean-pull.png'),
      howToPlay: 'Stretch each word out smoothly to pull the tide gently to shore.',
    },
    {
      key: 'arctic-glide',
      title: 'Arctic Glide',
      badge: require('@/assets/images/badge-arctic-glide.png'),
      howToPlay: 'Stretch the word out long and smooth to help Fin glide across the ice.',
    },
  ],
  'easy-onset': [
    {
      key: 'bubble-pop',
      title: 'Bubble Pop',
      badge: require('@/assets/images/badge-bubble-pop.png'),
      howToPlay: 'Say the word with a soft, easy start to pop the bubble and watch it burst into sparkles.',
    },
    {
      key: 'frost-breath',
      title: 'Frost Breath',
      badge: require('@/assets/images/badge-frost-breath.png'),
      howToPlay: 'Breathe out gently as you start the word to make frosty clouds appear.',
    },
    {
      key: 'wind-chime',
      title: 'Wind Chime',
      badge: require('@/assets/images/badge-wind-chime.png'),
      howToPlay: 'Start the word softly to make the wind chimes ring and sway.',
    },
    {
      key: 'flame-flicker',
      title: 'Flame Flicker',
      badge: require('@/assets/images/badge-flame-flicker.png'),
      howToPlay: 'Say the word with a gentle start to make the candle flame dance.',
    },
  ],
  'slow-speech': [
    {
      key: 'glacier-glide',
      title: 'Glacier Glide',
      badge: require('@/assets/images/badge-rainbow-stretch.png'),
      howToPlay: 'Say the word slowly to help the glacier glide smoothly across the ice.',
    },
    {
      key: 'snail-trail',
      title: 'Snail Trail',
      badge: require('@/assets/images/badge-balloon-blow.png'),
      howToPlay: 'Take your time with the word to help the snail leave a sparkly trail.',
    },
    {
      key: 'smooth-waves',
      title: 'Smooth Waves',
      badge: require('@/assets/images/badge-ocean-pull.png'),
      howToPlay: 'Speak slowly and smoothly to make gentle waves roll in.',
    },
    {
      key: 'ice-clock',
      title: 'Ice Clock',
      badge: require('@/assets/images/badge-ice-clock.png'),
      howToPlay: 'Say the word at a slow, steady pace to keep the ice clock ticking along.',
    },
  ],
  cancellation: [
    {
      key: 'ice-rebuild',
      title: 'Ice Rebuild',
      badge: require('@/assets/images/badge-ice-rebuild.png'),
      howToPlay: 'Say the word, pause, then say it again smoothly to rebuild the ice tower.',
    },
    {
      key: 'penguin-reset',
      title: 'Penguin Reset',
      badge: require('@/assets/images/badge-penguin-reset.png'),
      howToPlay: 'If you get stuck, pause and try the word again — watch Fin reset and cheer you on.',
    },
    {
      key: 'storm-calm',
      title: 'Storm Calm',
      badge: require('@/assets/images/badge-storm-calm.png'),
      howToPlay: 'Pause and breathe, then say the word again smoothly to calm the storm.',
    },
    {
      key: 'arctic-retry',
      title: 'Arctic Retry',
      badge: require('@/assets/images/badge-arctic-retry.png'),
      howToPlay: 'Take a breath and try the word again smoothly for another arctic adventure.',
    },
  ],
  'light-contact': [
    {
      key: 'feather-touch',
      title: 'Feather Touch',
      badge: require('@/assets/images/badge-feather-touch.png'),
      howToPlay: 'Touch the word very lightly with your voice to keep the feather floating.',
    },
    {
      key: 'soap-film',
      title: 'Soap Film',
      badge: require('@/assets/images/badge-soap-film.png'),
      howToPlay: 'Speak softly and gently to keep the soap film from popping.',
    },
    {
      key: 'candle-flame',
      title: 'Candle Flame',
      badge: require('@/assets/images/badge-candle-flame.png'),
      howToPlay: 'Say the word with a light touch to keep the candle flame glowing steady.',
    },
    {
      key: 'butterfly-land',
      title: 'Butterfly Land',
      badge: require('@/assets/images/badge-butterfly-land.png'),
      howToPlay: 'Speak gently to help the butterfly land softly on the flower.',
    },
  ],
};

export const ALL_GAMES_ORDERED: (GameCatalogEntry & { categoryKey: CategoryKey })[] = (
  ['easy-onset', 'slow-speech', 'light-contact', 'stretchy-speech', 'cancellation'] as CategoryKey[]
).flatMap((categoryKey) => GAME_CATALOG[categoryKey].map((game) => ({ ...game, categoryKey })));

/** Looks up a game's catalog entry (route key, badge, category) by its display title. */
export function findGameCatalogEntry(gameName: string) {
  return ALL_GAMES_ORDERED.find((game) => game.title.toLowerCase() === gameName.toLowerCase());
}
