// Watch the pattern grow: each successful round lights up the next pad in the melody, building a
// 5-note sequence by the final round. A miss just leaves the pattern where it is. Built on
// GameScreen.tsx.

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

const PAD_COLORS = ['#EF6F6C', GamesPalette.amberAccent, '#6FCF97', '#4DABF7', '#B197FC'];

function Pad({ lit, color }: { lit: boolean; color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (lit) {
      scale.value = withSequence(withTiming(1.18, { duration: 160 }), withSpring(1, { damping: 8, stiffness: 180 }));
    }
  }, [lit, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.pad, { backgroundColor: lit ? color : GamesPalette.iceBorder }, style]} />;
}

function SimonStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [litCount, setLitCount] = useState(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLitCount((c) => Math.min(PAD_COLORS.length, c + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  return (
    <View style={styles.stage}>
      <View style={styles.padRow}>
        {PAD_COLORS.map((color, i) => (
          <Pad key={i} color={color} lit={i < litCount} />
        ))}
      </View>
    </View>
  );
}

export function SimonSaysGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="simon-says"
        categoryKey={categoryKey}
        title="Simon Says"
        metricType={activeStrategy}
        words={words}
        hint="Say each word to add the next note to the pattern!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You played the whole pattern! 🎉"
        resultPartialText={(s) => `You added ${s} of 5 notes!`}
        renderStage={(stageProps) => <SimonStage {...stageProps} />}
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
  padRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pad: {
    width: 44,
    height: 96,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
