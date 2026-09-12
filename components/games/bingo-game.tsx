// A single B-I-N-G-O line: each successful round dabs the next cell, and dabbing all five calls
// BINGO. A miss leaves the cell open until the next success. Built on GameScreen.tsx.

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

const LETTERS = ['B', 'I', 'N', 'G', 'O'];

function Cell({ dabbed, letter }: { dabbed: boolean; letter: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (dabbed) {
      scale.value = withSequence(withTiming(1.2, { duration: 140 }), withSpring(1, { damping: 8, stiffness: 180 }));
    }
  }, [dabbed, scale]);
  const dabStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLetter}>{letter}</Text>
      {dabbed && <Animated.View style={[styles.dab, dabStyle]} />}
    </View>
  );
}

function BingoStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [dabbed, setDabbed] = useState(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDabbed((c) => Math.min(LETTERS.length, c + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const finished = dabbed >= LETTERS.length;

  return (
    <View style={styles.stage}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          {LETTERS.map((l) => (
            <Text key={l} style={styles.headerLetter}>
              {l}
            </Text>
          ))}
        </View>
        <View style={styles.cellRow}>
          {LETTERS.map((l, i) => (
            <Cell key={l} letter={l} dabbed={i < dabbed} />
          ))}
        </View>
        <Text style={styles.bingoText}>{finished ? 'BINGO! 🎉' : ' '}</Text>
      </View>
      <FinCharacter state={finished ? 'celebrating' : 'idle'} size={90} />
    </View>
  );
}

export function BingoGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="bingo"
        categoryKey={categoryKey}
        title="Bingo"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to dab the next square!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="A full line — BINGO! 🎉"
        resultPartialText={(s) => `You dabbed ${s} of 5 squares!`}
        renderStage={(stageProps) => <BingoStage {...stageProps} />}
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
    gap: 16,
    backgroundColor: GamesPalette.backgroundAlt,
  },
  card: {
    backgroundColor: GamesPalette.cardWhite,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    padding: 14,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  headerLetter: {
    width: 44,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: GamesPalette.navyAccent,
  },
  cellRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: GamesPalette.iceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLetter: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: GamesPalette.subtitle,
  },
  dab: {
    ...StyleSheet.absoluteFillObject,
    margin: 6,
    borderRadius: 20,
    backgroundColor: GamesPalette.amberAccent,
  },
  bingoText: {
    marginTop: 10,
    minHeight: 22,
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: GamesPalette.successGreen,
  },
});
