import { GameCategoryScreen } from '@/components/games/category-screen';

export default function StretchySpeechScreen() {
  return (
    <GameCategoryScreen
      title="Stretchy Speech"
      description="Stretch your words long and smooth"
      games={[
        {
          key: 'rainbow-stretch',
          title: 'Rainbow Stretch',
          description:
            'Stretch your words to paint a rainbow! The longer and smoother you speak the more colors appear!',
          badge: require('@/assets/images/badge-rainbow-stretch.png'),
          route: '/(tabs)/games/rainbow-stretch',
        },
        {
          key: 'balloon-blow',
          title: 'Balloon Blow',
          description: "Blow up Fin's balloon! Stretch your words out to make it grow bigger and bigger!",
          badge: require('@/assets/images/badge-balloon-blow.png'),
          route: '/(tabs)/games/balloon-blow',
        },
        {
          key: 'ocean-pull',
          title: 'Ocean Pull',
          description: 'Pull the wave across the ocean! Stretch each word out long and smooth like a rolling wave!',
          badge: require('@/assets/images/badge-ocean-pull.png'),
          route: '/(tabs)/games/ocean-pull',
        },
        {
          key: 'arctic-glide',
          title: 'Arctic Glide',
          description: 'Make the boomerang fly! Stretch your sounds out to send it gliding further across the arctic sky!',
          badge: require('@/assets/images/badge-arctic-glide.png'),
          route: '/(tabs)/games/arctic-glide',
        },
      ]}
    />
  );
}
