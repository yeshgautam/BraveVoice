// Two lanes race to the flag: Fin (top lane) boosts forward on each successful word, while the
// rival (bottom lane) creeps ahead a little every round. Clear words keep Fin in the lead. Built
// on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

const TRACK = 210; // px of travel from start to flag
const FIN_STEP = TRACK / 5; // full track over 5 successes
const RIVAL_STEP = TRACK / 6.5; // slightly slower, so good play wins the race

function RaceStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [finProgress, setFinProgress] = useState(0);
  const [rivalProgress, setRivalProgress] = useState(0);
  const finX = useSharedValue(0);
  const rivalX = useSharedValue(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFinProgress((p) => Math.min(TRACK, p + FIN_STEP));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // The rival always inches forward once a round resolves — win or miss.
    setRivalProgress((p) => Math.min(TRACK, p + RIVAL_STEP));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  useEffect(() => {
    finX.value = withSpring(finProgress, { damping: 13, stiffness: 120 });
  }, [finProgress, finX]);
  useEffect(() => {
    rivalX.value = withSpring(rivalProgress, { damping: 13, stiffness: 120 });
  }, [rivalProgress, rivalX]);

  const finStyle = useAnimatedStyle(() => ({ transform: [{ translateX: finX.value }] }));
  const rivalStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rivalX.value }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.lane}>
        <Animated.Text style={[styles.racer, finStyle]}>🐧</Animated.Text>
        <Text style={styles.flag}>🏁</Text>
      </View>
      <View style={styles.lane}>
        <Animated.Text style={[styles.racer, rivalStyle]}>🦭</Animated.Text>
        <Text style={styles.flag}>🏁</Text>
      </View>
    </View>
  );
}

export function TwoLaneRaceGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="two-lane-race"
        categoryKey={categoryKey}
        title="Two-Lane Race"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to boost Fin toward the finish line!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="Fin zoomed across the finish line! 🎉"
        resultPartialText={(s) => `Fin boosted ${s} of 5 times!`}
        renderStage={(stageProps) => <RaceStage {...stageProps} />}
      />
      <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
    backgroundColor: GamesPalette.backgroundAlt,
  },
  lane: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    backgroundColor: GamesPalette.cardWhite,
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  racer: {
    fontSize: 34,
  },
  flag: {
    fontSize: 28,
  },
});
