// Say your word to reveal your hand each round: a clear word throws a winning hand against Fin
// and your win-tally climbs; a miss is a tie for the round. Built on GameScreen.tsx.

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

// Winning pairings: [yourHand, finHand] where yourHand beats finHand. One per round cycles through.
const WIN_ROUNDS: { you: string; fin: string }[] = [
  { you: '🪨', fin: '✂️' },
  { you: '📄', fin: '🪨' },
  { you: '✂️', fin: '📄' },
  { you: '🪨', fin: '✂️' },
  { you: '📄', fin: '🪨' },
];

function RpsStage({ roundIndex, lastResult, resultRevealKey }: GameStageProps) {
  const [wins, setWins] = useState(0);
  const [reveal, setReveal] = useState<{ you: string; fin: string; won: boolean } | null>(null);
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    const pairing = WIN_ROUNDS[roundIndex % WIN_ROUNDS.length];
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWins((w) => w + 1);
      setReveal({ you: pairing.you, fin: pairing.fin, won: true });
      bounce.value = withSequence(withTiming(-14, { duration: 140 }), withSpring(0, { damping: 8, stiffness: 180 }));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // A miss is a friendly tie — both throw the same hand, no loss.
      setReveal({ you: pairing.you, fin: pairing.you, won: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const youStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.scoreboard}>
        <Text style={styles.scoreLabel}>WINS</Text>
        <Text style={styles.scoreValue}>{wins}</Text>
      </View>

      <View style={styles.handsRow}>
        <View style={styles.handCol}>
          <Animated.Text style={[styles.hand, youStyle]}>{reveal?.you ?? '❔'}</Animated.Text>
          <Text style={styles.handLabel}>You</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.handCol}>
          <Text style={styles.hand}>{reveal?.fin ?? '❔'}</Text>
          <Text style={styles.handLabel}>Fin</Text>
        </View>
      </View>

      <Text style={styles.outcome}>{reveal ? (reveal.won ? 'You win the round! 🎉' : "It's a tie — try again!") : ' '}</Text>
    </View>
  );
}

export function RockPaperScissorsGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="rock-paper-scissors"
        categoryKey={categoryKey}
        title="Rock Paper Scissors"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to reveal your hand against Fin!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You won every round! 🎉"
        resultPartialText={(s) => `You won ${s} of 5 rounds!`}
        renderStage={(stageProps) => <RpsStage {...stageProps} />}
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
    gap: 20,
    backgroundColor: GamesPalette.backgroundAlt,
  },
  scoreboard: {
    backgroundColor: GamesPalette.navyAccent,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    color: '#BFE3F5',
    letterSpacing: 1.5,
  },
  scoreValue: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  handsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  handCol: {
    alignItems: 'center',
    gap: 6,
  },
  hand: {
    fontSize: 56,
  },
  handLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: GamesPalette.subtitle,
  },
  vs: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: GamesPalette.subtitle,
  },
  outcome: {
    minHeight: 22,
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: GamesPalette.successGreen,
  },
});
