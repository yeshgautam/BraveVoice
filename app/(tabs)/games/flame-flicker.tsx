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

import { PulseVisualProps, PulseWordGame, WORDS_PER_ROUND } from '@/components/games/pulse-word-game';

const WORDS = ['farm', 'friend', 'forest', 'flower', 'flag', 'fly', 'frost'];
const WORD_EMOJIS = ['🚜', '🧑‍🤝‍🧑', '🌲', '🌸', '🚩', '🪰', '❄️'];

function Candle({ glowing }: { glowing: boolean }) {
  const flicker = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(withTiming(1, { duration: 260, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 260, easing: Easing.inOut(Easing.sin) })),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    glow.value = withTiming(glowing ? 1 : 0, { duration: 400 });
  }, [glowing, glow]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + flicker.value * 0.12 }, { rotate: `${(flicker.value - 0.5) * 6}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={styles.candleColumn}>
      <View style={styles.sparkleWrap}>
        <Animated.View style={[styles.sparkle, glowStyle]}>
          <View style={styles.sparkleDotA} />
          <View style={styles.sparkleDotB} />
        </Animated.View>
        <Animated.View style={[styles.flame, glowing ? styles.flameGlowing : styles.flameIdle, flameStyle]} />
      </View>
      <View style={styles.wick} />
      <View style={[styles.candleBody, glowing && styles.candleBodyGold]} />
      <View style={styles.iceShelf} />
    </View>
  );
}

function FlameFlickerVisual({ completedIndices }: PulseVisualProps) {
  return (
    <View style={styles.sceneContainer}>
      <View style={styles.candleRow}>
        {WORDS.map((_, i) => (
          <Candle key={i} glowing={completedIndices[i]} />
        ))}
      </View>
      <Image source={require('@/assets/images/fin-avatar.png')} style={styles.finCorner} contentFit="contain" />
    </View>
  );
}

export default function FlameFlickerScreen() {
  return (
    <PulseWordGame
      gameKey="flame-flicker"
      categoryKey="easy-onset"
      title="Flame Flicker"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Gentle breath — don't blow it out! 🕯️"
      micHint="Soft breath — keep it gentle!"
      resultCompleteText="You kept all the flames glowing! 🕯️"
      resultPartialText={(score) => `You kept ${score} of ${WORDS_PER_ROUND} flames glowing!`}
      renderVisual={(props) => <FlameFlickerVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: '#1A2A3A',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  candleRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    alignItems: 'flex-end',
  },
  candleColumn: {
    alignItems: 'center',
  },
  sparkleWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  sparkleDotA: {
    position: 'absolute',
    top: 0,
    left: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F5C842',
  },
  sparkleDotB: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F5C842',
  },
  flame: {
    width: 14,
    height: 22,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  flameIdle: {
    backgroundColor: '#E8724A',
  },
  flameGlowing: {
    backgroundColor: '#F5C842',
  },
  wick: {
    width: 3,
    height: 6,
    backgroundColor: '#3A2A1A',
  },
  candleBody: {
    width: 20,
    height: 60,
    backgroundColor: '#EAF0F5',
    borderRadius: 3,
  },
  candleBodyGold: {
    backgroundColor: '#FCEFC7',
  },
  iceShelf: {
    width: 34,
    height: 8,
    backgroundColor: '#3C5A70',
    borderRadius: 3,
    marginTop: 4,
  },
  finCorner: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 56,
    height: 56,
  },
});
