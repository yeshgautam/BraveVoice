// Fin pops up from an ice hole per round: confident full pop-up on success, a gentle duck-back-down
// on a miss (no violent "whack" — this is a speech game, not a hit game). Built on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

function MoleStage({ phase, lastResult, resultRevealKey }: GameStageProps) {
  const popY = useSharedValue(60);

  useEffect(() => {
    if (phase === 'recording') {
      popY.value = withSpring(0, { damping: 10, stiffness: 140 });
    } else if (phase === 'ready') {
      popY.value = withTiming(60, { duration: 260, easing: Easing.in(Easing.quad) });
    }
  }, [phase, popY]);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      popY.value = withSequence(withSpring(-18, { damping: 8, stiffness: 180 }), withSpring(0, { damping: 10, stiffness: 140 }));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      popY.value = withTiming(50, { duration: 320, easing: Easing.in(Easing.quad) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const moleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: popY.value }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.iceHole} />
      <Animated.View style={[styles.moleWrap, moleStyle]}>
        <FinCharacter state={lastResult?.success ? 'celebrating' : phase === 'recording' ? 'listening' : 'idle'} size={130} />
      </Animated.View>
    </View>
  );
}

export function WhackAMoleGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="whack-a-mole"
        categoryKey={categoryKey}
        title="Whack-a-Mole"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to boop Fin before he ducks away!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You booped Fin every time! 🎉"
        resultPartialText={(s) => `You booped Fin ${s} of 5 times!`}
        renderStage={(stageProps) => <MoleStage {...stageProps} />}
      />
      <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: GamesPalette.backgroundAlt,
  },
  iceHole: {
    position: 'absolute',
    bottom: 24,
    width: 180,
    height: 40,
    borderRadius: 90,
    backgroundColor: GamesPalette.iceBorder,
  },
  moleWrap: {
    marginBottom: -10,
  },
});
