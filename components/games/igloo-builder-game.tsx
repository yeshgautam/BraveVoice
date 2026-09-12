// One ice brick is added to a growing igloo per successful round — never a negative/gallows
// structure, only ever building up. A full 5-brick igloo is the round-5 payoff. Built on
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
import { FinCharacter } from '@/game-engine/FinCharacter';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';
import { ParticleBurst } from '@/game-engine/ParticleBurst';

// Bottom-up brick rows: row 0 (widest, bottom) → row 4 (the entrance-cap brick on top).
const BRICK_ROWS = [
  { width: 200, count: 1 },
  { width: 170, count: 1 },
  { width: 140, count: 1 },
  { width: 108, count: 1 },
  { width: 70, count: 1 },
];

function Brick({ revealed, width }: { revealed: boolean; width: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    if (revealed) {
      scale.value = withSequence(withTiming(1.15, { duration: 140 }), withSpring(1, { damping: 8, stiffness: 180 }));
    }
  }, [revealed, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (!revealed) return <View style={[styles.brickGhost, { width }]} />;
  return <Animated.View style={[styles.brick, { width }, style]} />;
}

function IglooStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [builtCount, setBuiltCount] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBuiltCount((c) => Math.min(BRICK_ROWS.length, c + 1));
      setBurstKey((k) => k + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const finished = builtCount >= BRICK_ROWS.length;

  return (
    <View style={styles.stage}>
      <View style={styles.igloo}>
        {[...BRICK_ROWS].reverse().map((row, i) => {
          const rowIndex = BRICK_ROWS.length - 1 - i;
          return <Brick key={rowIndex} width={row.width} revealed={rowIndex < builtCount} />;
        })}
        <View style={styles.particleOverlay} pointerEvents="none">
          <ParticleBurst burstKey={burstKey} size={200} colors={['#FFFFFF', GamesPalette.iceBorder, GamesPalette.amberAccent]} />
        </View>
      </View>
      <FinCharacter state={finished ? 'celebrating' : 'idle'} size={100} />
    </View>
  );
}

export function IglooBuilderGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="igloo-builder"
        categoryKey={categoryKey}
        title="Igloo Builder"
        metricType={activeStrategy}
        words={words}
        hint="Say each word to add a brick to Fin's igloo!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You built the whole igloo! 🎉"
        resultPartialText={(s) => `You added ${s} of 5 bricks!`}
        renderStage={(stageProps) => <IglooStage {...stageProps} />}
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
  igloo: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  particleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brick: {
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    marginBottom: 4,
  },
  brickGhost: {
    height: 28,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(181,212,244,0.35)',
    borderStyle: 'dashed',
    marginBottom: 4,
  },
});
