import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['rainbow', 'road', 'rain', 'river', 'roll', 'reach', 'roar'];
const WORD_EMOJIS = ['🌈', '🛣️', '🌧️', '🏞️', '🎢', '🙌', '📢'];

const BAND_COLORS = ['#7C3AED', '#4DABF7', '#20C997', '#F5C842', '#FFA94D', '#FF922B', '#E8394A'];
const ARC_WIDTH = 260;
const BAND_THICKNESS = 15;

function RainbowVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  return (
    <View style={styles.sceneContainer}>
      <View style={styles.arcContainer}>
        {BAND_COLORS.map((color, index) => {
          const size = ARC_WIDTH - index * BAND_THICKNESS * 2;
          const ratio = index === wordIndex && isListening ? liveFill : index <= wordIndex ? wordFillRatios[index] : 0;
          const opacity = ratio <= 0 ? 0.12 : 0.35 + ratio * 0.65;
          return (
            <View
              key={color}
              style={[
                styles.arcBand,
                {
                  width: size,
                  height: size / 2,
                  borderTopLeftRadius: size / 2,
                  borderTopRightRadius: size / 2,
                  left: (ARC_WIDTH - size) / 2,
                  backgroundColor: color,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
      <Image source={require('@/assets/images/fin-avatar.png')} style={styles.finCloud} contentFit="contain" />
    </View>
  );
}

export default function RainbowStretchScreen() {
  return (
    <MeterWordGame
      gameKey="rainbow-stretch"
      categoryKey="stretchy-speech"
      title="Rainbow Stretch"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Stretch your word out loooong! 🌈"
      micHint="Streeetch it out!"
      resultCompleteText="You painted the whole rainbow! 🌈"
      resultPartialText={(score) => `You painted ${score} of ${WORDS_PER_ROUND} bands!`}
      formatScore={(goodCount) => `${goodCount} / ${WORDS_PER_ROUND}`}
      renderVisual={(props) => <RainbowVisual {...props} />}
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
  arcContainer: {
    width: ARC_WIDTH,
    height: ARC_WIDTH / 2,
    position: 'relative',
  },
  arcBand: {
    position: 'absolute',
    bottom: 0,
  },
  finCloud: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    width: 56,
    height: 56,
  },
});
