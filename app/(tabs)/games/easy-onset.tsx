import { GameCategoryScreen } from '@/components/games/category-screen';

export default function EasyOnsetScreen() {
  return (
    <GameCategoryScreen
      title="Easy Onset"
      description="Start every word with a gentle breath"
      games={[
        {
          key: 'bubble-pop',
          title: 'Bubble Pop',
          description: 'Say the word softly and pop the bubbles! The gentler you start, the more bubbles you pop!',
          badge: require('@/assets/images/badge-bubble-pop.png'),
          route: '/(tabs)/games/bubble-pop',
        },
        {
          key: 'frost-breath',
          title: 'Frost Breath',
          description: 'Breathe out softly before you speak! Watch the window frost up as your gentle airflow starts the word!',
          badge: require('@/assets/images/badge-frost-breath.png'),
          route: '/(tabs)/games/frost-breath',
        },
        {
          key: 'wind-chime',
          title: 'Wind Chime',
          description: 'Make the chimes ring! Start your airflow gently before the word to set the wind chimes singing!',
          badge: require('@/assets/images/badge-wind-chime.png'),
          route: '/(tabs)/games/wind-chime',
        },
        {
          key: 'flame-flicker',
          title: 'Flame Flicker',
          description: 'Start your breath before the word! Let the flame flicker softly as your airflow begins the word gently!',
          badge: require('@/assets/images/badge-flame-flicker.png'),
          route: '/(tabs)/games/flame-flicker',
        },
      ]}
    />
  );
}
