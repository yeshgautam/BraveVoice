// Fin waddles one stepping-stone forward through the maze on each successful round, reaching the
// flag by round 5. A miss just keeps him where he is. Built on GameScreen.tsx.

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

const STEPS = 5;
const STEP_W = 50; // tile width (42) + gap (8)

function MazeStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [steps, setSteps] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSteps((s) => Math.min(STEPS, s + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  useEffect(() => {
    progress.value = withSpring(steps, { damping: 12, stiffness: 120 });
  }, [steps, progress]);

  const tokenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * STEP_W }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.track}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.tile, i < steps && styles.tileDone]} />
        ))}
        <Text style={styles.flag}>🚩</Text>
        <Animated.View style={[styles.token, tokenStyle]}>
          <Text style={styles.tokenEmoji}>🐧</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export function MazeRunnerGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="maze-runner"
        categoryKey={categoryKey}
        title="Maze Runner"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to help Fin waddle one step forward!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="Fin reached the end of the maze! 🎉"
        resultPartialText={(s) => `Fin took ${s} of 5 steps!`}
        renderStage={(stageProps) => <MazeStage {...stageProps} />}
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
  track: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    height: 90,
  },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: GamesPalette.cardWhite,
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
  },
  tileDone: {
    backgroundColor: '#D6F0DE',
    borderColor: GamesPalette.successGreen,
  },
  flag: {
    fontSize: 30,
    marginLeft: 4,
  },
  token: {
    position: 'absolute',
    left: 0,
    width: 42,
    alignItems: 'center',
  },
  tokenEmoji: {
    fontSize: 34,
  },
});
