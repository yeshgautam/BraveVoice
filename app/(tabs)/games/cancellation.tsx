import { GameCategoryScreen } from '@/components/games/category-screen';

export default function CancellationScreen() {
  return (
    <GameCategoryScreen
      title="Cancellation"
      description="Pause, breathe, and try again smoothly"
      games={[
        {
          key: 'ice-rebuild',
          title: 'Ice Rebuild',
          description: 'Oops the ice cracked! Pause, take a big breath, then say the word again nice and smooth to fix it!',
          badge: require('@/assets/images/badge-ice-rebuild.png'),
          route: '/(tabs)/games/ice-rebuild',
        },
        {
          key: 'penguin-reset',
          title: 'Penguin Reset',
          description: 'Fin stumbled! Pause, help him find his balance, then try the path again smoothly!',
          badge: require('@/assets/images/badge-penguin-reset.png'),
          route: '/(tabs)/games/penguin-reset',
        },
        {
          key: 'storm-calm',
          title: 'Storm Calm',
          description: 'Bumpy speech made a blizzard! Pause, breathe deeply, and calm the storm with smooth speech!',
          badge: require('@/assets/images/badge-storm-calm.png'),
          route: '/(tabs)/games/storm-calm',
        },
        {
          key: 'arctic-retry',
          title: 'Arctic Retry',
          description: 'Fin slipped on the mountain! Pause, find your footing, then try again nice and steady!',
          badge: require('@/assets/images/badge-arctic-retry.png'),
          route: '/(tabs)/games/arctic-retry',
        },
      ]}
    />
  );
}
