import { StyleSheet, Text, View } from 'react-native';

import { CancellationVisualProps, CancellationWordGame, WORDS_PER_ROUND } from '@/components/games/cancellation-word-game';
import { Fonts } from '@/constants/theme';

const WORDS = ['storm', 'star', 'step', 'skip', 'spin', 'stop', 'stay'];
const WORD_EMOJIS = ['🌨️', '⭐', '👣', '⏭️', '🌀', '🛑', '✋'];

function StormCalmVisual({ completedIndices, step }: CancellationVisualProps) {
  const stormy = step === 'finish' || step === 'pause';
  const calmCount = completedIndices.filter(Boolean).length;

  return (
    <View style={[styles.sceneContainer, { backgroundColor: stormy ? '#6E8296' : '#D6EDF8' }]}>
      <Text style={styles.snowflakeMeter}>{'❄️'.repeat(stormy ? 5 : Math.max(1, 5 - calmCount))}</Text>
      <Text style={styles.mainEmoji}>{stormy ? '🌪️' : '🐧'}</Text>
      <Text style={styles.calmCountText}>Storms calmed: {calmCount} / {WORDS.length}</Text>
    </View>
  );
}

export default function StormCalmScreen() {
  return (
    <CancellationWordGame
      gameKey="storm-calm"
      categoryKey="cancellation"
      title="Storm Calm"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Calm the storm with smooth speech! 🌨️"
      resultCompleteText="You calmed all 7 storms! 🌨️"
      resultPartialText={(score) => `You calmed ${score} of ${WORDS_PER_ROUND} storms!`}
      renderVisual={(props) => <StormCalmVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  snowflakeMeter: {
    fontSize: 18,
  },
  mainEmoji: {
    fontSize: 56,
  },
  calmCountText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
