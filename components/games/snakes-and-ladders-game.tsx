// Say the word to roll: a clear word rolls the die and hops Fin's token two cells forward along
// the trail, reaching the end by round 5. A miss is a roll of zero — no move. Built on
// GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

const CELLS = 10; // two cells per success over 5 rounds
const CELL = 30; // width + gap per cell for the token hop

function SnakesStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [pos, setPos] = useState(0);
  const [die, setDie] = useState(0);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDie(2);
      setPos((p) => Math.min(CELLS, p + 2));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setDie(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  useEffect(() => {
    hop.value = withSequence(withTiming(pos * CELL - 8, { duration: 180 }), withSpring(pos * CELL, { damping: 10, stiffness: 160 }));
  }, [pos, hop]);

  const tokenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: hop.value }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.dieBox}>
        <Text style={styles.dieText}>{die > 0 ? `🎲 ${die}` : '🎲'}</Text>
      </View>
      <View style={styles.trail}>
        {Array.from({ length: CELLS }, (_, i) => (
          <View key={i} style={[styles.cell, i < pos && styles.cellDone]} />
        ))}
        <Text style={styles.goal}>🏆</Text>
        <Animated.View style={[styles.token, tokenStyle]}>
          <Text style={styles.tokenEmoji}>🐧</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export function SnakesAndLaddersGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="snakes-and-ladders"
        categoryKey={categoryKey}
        title="Snakes & Ladders"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to roll and move along the trail!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You reached the top of the board! 🎉"
        resultPartialText={(s) => `You rolled a win ${s} of 5 times!`}
        renderStage={(stageProps) => <SnakesStage {...stageProps} />}
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
    gap: 24,
    backgroundColor: GamesPalette.backgroundAlt,
  },
  dieBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  dieText: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  trail: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    height: 70,
  },
  cell: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: GamesPalette.cardWhite,
    borderWidth: 1.5,
    borderColor: GamesPalette.iceBorder,
  },
  cellDone: {
    backgroundColor: '#D6F0DE',
    borderColor: GamesPalette.successGreen,
  },
  goal: {
    fontSize: 26,
    marginLeft: 4,
  },
  token: {
    position: 'absolute',
    left: 0,
    width: 24,
    alignItems: 'center',
  },
  tokenEmoji: {
    fontSize: 26,
  },
});
