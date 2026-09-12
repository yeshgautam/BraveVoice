import { StyleSheet, Text, View } from 'react-native';

import { CancellationVisualProps, CancellationWordGame, WORDS_PER_ROUND } from '@/components/games/cancellation-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['ice', 'in', 'it', 'into', 'island', 'inside', 'instead'];
const WORD_EMOJIS = ['🧊', '➡️', '👉', '🚪', '🏝️', '🏠', '🔄'];

function IceBlock({ done, cracked }: { done: boolean; cracked: boolean }) {
  return (
    <View style={[styles.block, done && styles.blockDone]}>
      {cracked && !done && <Text style={styles.crack}>⚡</Text>}
      {done && <Text style={styles.shimmer}>✨</Text>}
    </View>
  );
}

function IceRebuildVisual({ completedIndices, activeIndex, step }: CancellationVisualProps) {
  return (
    <View style={styles.sceneContainer}>
      <View style={styles.wall}>
        {WORDS.map((_, i) => (
          <IceBlock key={i} done={completedIndices[i]} cracked={i === activeIndex && (step === 'finish' || step === 'pause')} />
        ))}
      </View>
    </View>
  );
}

export default function IceRebuildScreen() {
  return (
    <CancellationWordGame
      gameKey="ice-rebuild"
      categoryKey="cancellation"
      title="Ice Rebuild"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Finish the word, pause, then try again! 🧊"
      resultCompleteText="You rebuilt the ice wall! 🧊"
      resultPartialText={(score) => `You rebuilt ${score} of ${WORDS_PER_ROUND} blocks!`}
      renderVisual={(props) => <IceRebuildVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '80%',
  },
  block: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#BFE0F5',
    borderWidth: 2,
    borderColor: '#7FB8DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockDone: {
    backgroundColor: '#FCEFC7',
    borderColor: '#F0B429',
  },
  crack: {
    fontSize: 22,
    color: '#E8394A',
  },
  shimmer: {
    fontSize: 20,
  },
});
