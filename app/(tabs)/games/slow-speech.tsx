import { GameCategoryScreen } from '@/components/games/category-screen';

export default function SlowSpeechScreen() {
  return (
    <GameCategoryScreen
      title="Slow Speech"
      description="Take it nice and slow"
      games={[
        {
          key: 'glacier-glide',
          title: 'Glacier Glide',
          description: 'Help Fin glide across the ice! The slower and smoother you talk, the further he slides!',
          badge: require('@/assets/images/badge-rainbow-stretch.png'),
          route: '/(tabs)/games/glacier-glide',
        },
        {
          key: 'snail-trail',
          title: 'Snail Trail',
          description: "Follow the snail's trail! Stretch each word out slowly to help the snail reach the finish!",
          badge: require('@/assets/images/badge-balloon-blow.png'),
          route: '/(tabs)/games/snail-trail',
        },
        {
          key: 'smooth-waves',
          title: 'Smooth Waves',
          description: 'Keep the ocean calm! Speak slowly and smoothly to keep the waves gentle and peaceful!',
          badge: require('@/assets/images/badge-ocean-pull.png'),
          route: '/(tabs)/games/smooth-waves',
        },
        {
          key: 'ice-clock',
          title: 'Ice Clock',
          description: 'Beat the melting clock! Speak slowly to keep the ice from melting away!',
          badge: require('@/assets/images/badge-ice-clock.png'),
          route: '/(tabs)/games/ice-clock',
        },
      ]}
    />
  );
}
