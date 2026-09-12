import { GameCategoryScreen } from '@/components/games/category-screen';

export default function LightContactScreen() {
  return (
    <GameCategoryScreen
      title="Light Contact"
      description="Touch your lips and tongue very gently"
      games={[
        {
          key: 'feather-touch',
          title: 'Feather Touch',
          description: 'Speak so gently the feather barely moves! Touch your lips softly as you say each word!',
          badge: require('@/assets/images/badge-feather-touch.png'),
          route: '/(tabs)/games/feather-touch',
        },
        {
          key: 'soap-film',
          title: 'Soap Film',
          description: "Don't pop the bubble! Speak so softly and gently the soap film stays perfectly still!",
          badge: require('@/assets/images/badge-soap-film.png'),
          route: '/(tabs)/games/soap-film',
        },
        {
          key: 'candle-flame',
          title: 'Candle Flame',
          description: "Keep Fin's candle glowing! Say the word so gently the flame doesn't flicker!",
          badge: require('@/assets/images/badge-candle-flame.png'),
          route: '/(tabs)/games/candle-flame',
        },
        {
          key: 'butterfly-land',
          title: 'Butterfly Land',
          description: 'Be super gentle! Speak so softly the butterfly trusts you enough to land on Fin’s wing!',
          badge: require('@/assets/images/badge-butterfly-land.png'),
          route: '/(tabs)/games/butterfly-land',
        },
      ]}
    />
  );
}
