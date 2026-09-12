import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PulseVisualProps, PulseWordGame } from '@/components/games/pulse-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['wind', 'water', 'whale', 'wolf', 'walrus', 'winter', 'wave'];
const WORD_EMOJIS = ['💨', '🌊', '🐋', '🐺', '🦭', '❄️', '🌊'];

const CHIME_HEIGHTS = [10, 26, 4, 32, 14, 0, 20];

function Chime({ active, index }: { active: boolean; index: number }) {
  const swing = useSharedValue(0);
  const noteOpacity = useSharedValue(0);
  const noteY = useSharedValue(0);

  useEffect(() => {
    if (active) {
      swing.value = withRepeat(
        withSequence(withTiming(14, { duration: 320, easing: Easing.inOut(Easing.sin) }), withTiming(-14, { duration: 320, easing: Easing.inOut(Easing.sin) })),
        4,
        true
      );
      noteOpacity.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 900 }));
      noteY.value = 0;
      noteY.value = withTiming(-40, { duration: 1000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const rodStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));
  const noteStyle = useAnimatedStyle(() => ({ opacity: noteOpacity.value, transform: [{ translateY: noteY.value }] }));

  return (
    <View style={[styles.chimeColumn, { marginTop: CHIME_HEIGHTS[index] }]}>
      <Animated.Text style={[styles.noteEmoji, noteStyle]}>♪</Animated.Text>
      <Animated.View style={[styles.chimeRod, active ? styles.chimeRodActive : styles.chimeRodInactive, rodStyle]} />
      <View style={[styles.chimeBell, active ? styles.chimeRodActive : styles.chimeRodInactive]} />
    </View>
  );
}

function WindChimeVisual({ completedIndices }: PulseVisualProps) {
  return (
    <View style={styles.sceneContainer}>
      <View style={styles.beam} />
      <View style={styles.chimeRow}>
        {WORDS.map((_, i) => (
          <Chime key={i} active={completedIndices[i]} index={i} />
        ))}
      </View>
      <Image source={require('@/assets/images/fin-avatar.png')} style={styles.finCorner} contentFit="contain" />
    </View>
  );
}

const WORDS_LEN = WORDS.length;

export default function WindChimeScreen() {
  return (
    <PulseWordGame
      gameKey="wind-chime"
      categoryKey="easy-onset"
      title="Wind Chime"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Let your breath flow first 💨"
      micHint="Start soft, let the air flow!"
      resultCompleteText="You made all the chimes sing! 🎵"
      resultPartialText={(score) => `You rang ${score} of ${WORDS_LEN} chimes!`}
      renderVisual={(props) => <WindChimeVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    paddingTop: 24,
  },
  beam: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7A9AB0',
  },
  chimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '90%',
    marginTop: 4,
  },
  chimeColumn: {
    alignItems: 'center',
  },
  noteEmoji: {
    fontSize: 16,
    height: 18,
  },
  chimeRod: {
    width: 6,
    height: 70,
    borderRadius: 3,
  },
  chimeBell: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -2,
  },
  chimeRodActive: {
    backgroundColor: OnboardingPalette.progressActive,
  },
  chimeRodInactive: {
    backgroundColor: '#C8DFF0',
  },
  finCorner: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 60,
    height: 60,
  },
});
