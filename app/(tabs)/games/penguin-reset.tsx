import { StyleSheet, Text, View } from 'react-native';

import { CancellationVisualProps, CancellationWordGame, WORDS_PER_ROUND } from '@/components/games/cancellation-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['penguin', 'path', 'proud', 'push', 'pull', 'put', 'park'];
const WORD_EMOJIS = ['🐧', '🛤️', '😊', '👐', '🤝', '📌', '🏞️'];

function PenguinResetVisual({ completedIndices, step }: CancellationVisualProps) {
  const completedCount = completedIndices.filter(Boolean).length;
  const progress = completedCount / WORDS.length;
  const stumbled = step === 'finish' || step === 'pause';

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.path}>
        <View style={[styles.pathFill, { width: `${progress * 100}%` }]} />
        {WORDS.map((_, i) => (
          <Text key={i} style={[styles.flag, { left: `${(i / (WORDS.length - 1)) * 92}%` }]}>
            {completedIndices[i] ? '🚩' : '📍'}
          </Text>
        ))}
        <Text style={[styles.finWalker, { left: `${Math.min(90, progress * 100)}%` }]}>
          {stumbled ? '😵' : '🐧'}
        </Text>
      </View>
    </View>
  );
}

export default function PenguinResetScreen() {
  return (
    <CancellationWordGame
      gameKey="penguin-reset"
      categoryKey="cancellation"
      title="Penguin Reset"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Finish it, pause, then say it smooth! 🔄"
      resultCompleteText="Fin made it to the end! 🐧"
      resultPartialText={(score) => `Fin reached ${score} of ${WORDS_PER_ROUND} flags!`}
      renderVisual={(props) => <PenguinResetVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  path: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    position: 'relative',
  },
  pathFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
    backgroundColor: OnboardingPalette.progressActive,
  },
  flag: {
    position: 'absolute',
    top: -16,
    fontSize: 14,
  },
  finWalker: {
    position: 'absolute',
    top: -30,
    fontSize: 28,
  },
});
