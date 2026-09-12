// Gameshow-styled stage: a scoreboard tracks correct buzz-ins and a row of marquee lights lights
// up as rounds are won. Fin wears a bow-tie for the occasion (a game-local overlay — this
// accessory isn't in the Rewards catalog, just this game's own flourish). Built on GameScreen.tsx.

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
import { FinCharacter } from '@/game-engine/FinCharacter';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

function QuizStage({ roundIndex, lastResult, resultRevealKey }: GameStageProps) {
  const [score, setScore] = useState(0);
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore((s) => s + 1);
      bounce.value = withSequence(withTiming(-14, { duration: 140 }), withSpring(0, { damping: 8, stiffness: 180 }));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const finStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.lightsRow}>
        {Array.from({ length: 5 }, (_, i) => (
          <View key={i} style={[styles.light, i < score && styles.lightLit]} />
        ))}
      </View>

      <View style={styles.scoreboard}>
        <Text style={styles.scoreboardLabel}>SCORE</Text>
        <Text style={styles.scoreboardValue}>{score}</Text>
      </View>

      <Animated.View style={[styles.finWrap, finStyle]}>
        <FinCharacter state={lastResult?.success ? 'celebrating' : 'idle'} size={120} />
        <Text style={styles.bowTie}>🎀</Text>
      </Animated.View>

      <Text style={styles.questionCounter}>Question {roundIndex + 1} of 5</Text>
    </View>
  );
}

export function QuizShowGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="quiz-show"
        categoryKey={categoryKey}
        title="Quiz Show"
        metricType={activeStrategy}
        words={words}
        hint="Say your answer out loud to buzz in!"
        micHint="Buzz in!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="Perfect score — you swept the show! 🎉"
        resultPartialText={(s) => `You buzzed in correctly ${s} of 5 times!`}
        renderStage={(stageProps) => <QuizStage {...stageProps} />}
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
    gap: 14,
    backgroundColor: GamesPalette.backgroundAlt,
  },
  lightsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  light: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GamesPalette.iceBorder,
  },
  lightLit: {
    backgroundColor: GamesPalette.amberAccent,
  },
  scoreboard: {
    backgroundColor: GamesPalette.navyAccent,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scoreboardLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    color: '#BFE3F5',
    letterSpacing: 1.5,
  },
  scoreboardValue: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  finWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowTie: {
    position: 'absolute',
    fontSize: 26,
    top: '54%',
  },
  questionCounter: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: GamesPalette.subtitle,
  },
});
