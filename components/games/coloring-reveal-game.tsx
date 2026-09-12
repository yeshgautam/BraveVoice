// Each successful round fills the next petal of a flower with color, blooming the whole picture by
// round 5. A miss leaves the petal grey until the next success. Coloring Reveal is the one game the
// visual spec allows a softer pastel palette of its own. Built on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

// Softer pastel fills, per the spec's Coloring Reveal exception. Five petals around a center.
const PETAL_COLORS = ['#FFB3C1', '#FFD6A5', '#FDD85D', '#CAFFBF', '#A0C4FF'];
const PETAL_ANGLES = [0, 72, 144, 216, 288];
const FLOWER = 200; // flower container size
const PETAL = 56; // petal diameter
const RADIUS = 62; // distance from center to each petal center

function Petal({ filled, color, angle }: { filled: boolean; color: string; angle: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (filled) {
      scale.value = withSequence(withTiming(1.2, { duration: 150 }), withSpring(1, { damping: 8, stiffness: 180 }));
    }
  }, [filled, scale]);
  const rad = (angle * Math.PI) / 180;
  // Position each petal around the flower's center (FLOWER/2), offset by half the petal so its
  // own center lands on the ring. `transform` is reserved for the scale animation — mixing a
  // static translate here would be clobbered, since the last `transform` in the style array wins.
  const left = FLOWER / 2 - PETAL / 2 + RADIUS * Math.cos(rad);
  const top = FLOWER / 2 - PETAL / 2 + RADIUS * Math.sin(rad);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        styles.petal,
        {
          left,
          top,
          backgroundColor: filled ? color : '#FFFFFF',
          borderColor: filled ? '#FFFFFF' : GamesPalette.iceBorder,
        },
        style,
      ]}
    />
  );
}

function ColoringStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFilled((c) => Math.min(PETAL_COLORS.length, c + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  return (
    <View style={styles.stage}>
      <View style={styles.flower}>
        {PETAL_COLORS.map((color, i) => (
          <Petal key={i} color={color} angle={PETAL_ANGLES[i]} filled={i < filled} />
        ))}
        <View style={styles.center} />
      </View>
    </View>
  );
}

export function ColoringRevealGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="coloring-reveal"
        categoryKey={categoryKey}
        title="Coloring Reveal"
        metricType={activeStrategy}
        words={words}
        hint="Say each word to fill in the next splash of color!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="The whole picture is in full color! 🎉"
        resultPartialText={(s) => `You colored ${s} of 5 parts!`}
        renderStage={(stageProps) => <ColoringStage {...stageProps} />}
      />
      <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GamesPalette.backgroundAlt,
  },
  flower: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  center: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: GamesPalette.amberAccent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
