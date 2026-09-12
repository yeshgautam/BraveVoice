// Each successful round connects the next numbered dot, gradually revealing a simple line-art
// star by round 5 — a miss just leaves the dot unconnected until the next success. Built on
// GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

// A simple 5-point star outline, closing back to the first dot on the 5th connection.
const DOTS = [
  { x: 130, y: 20 },
  { x: 210, y: 110 },
  { x: 175, y: 210 },
  { x: 85, y: 210 },
  { x: 50, y: 110 },
];

function edgeStyle(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { width: length, left: from.x, top: from.y, transform: [{ rotate: `${angle}deg` }] as const };
}

function ConnectedEdge({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
  const width = useSharedValue(0);
  const targetWidth = edgeStyle(from, to).width;
  useEffect(() => {
    width.value = withTiming(targetWidth, { duration: 450 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWidth]);
  const animStyle = useAnimatedStyle(() => ({ width: width.value }));
  const base = edgeStyle(from, to);
  return <Animated.View style={[styles.edge, { left: base.left, top: base.top, transform: base.transform }, animStyle]} />;
}

function DotsStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [connected, setConnected] = useState(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConnected((c) => Math.min(DOTS.length, c + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const finished = connected >= DOTS.length;

  return (
    <View style={styles.stage}>
      <View style={styles.canvas}>
        {DOTS.map((d, i) => {
          const nextIndex = (i + 1) % DOTS.length;
          const shouldDrawEdge = i < connected;
          return (
            <View key={i}>
              {shouldDrawEdge && <ConnectedEdge from={d} to={DOTS[nextIndex]} />}
              <View style={[styles.dot, i < connected && styles.dotConnected, { left: d.x - 12, top: d.y - 12 }]}>
                <Text style={[styles.dotNumber, i < connected && styles.dotNumberConnected]}>{i + 1}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <FinCharacter state={finished ? 'celebrating' : 'idle'} size={90} />
    </View>
  );
}

export function ConnectTheDotsRevealGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="connect-the-dots-reveal"
        categoryKey={categoryKey}
        title="Connect-the-Dots Reveal"
        metricType={activeStrategy}
        words={words}
        hint="Say each word to connect the next dot!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You revealed the whole picture! 🎉"
        resultPartialText={(s) => `You connected ${s} of 5 dots!`}
        renderStage={(stageProps) => <DotsStage {...stageProps} />}
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
    gap: 12,
    backgroundColor: GamesPalette.backgroundAlt,
  },
  canvas: {
    width: 260,
    height: 230,
  },
  edge: {
    position: 'absolute',
    height: 3,
    backgroundColor: GamesPalette.navyAccent,
    borderRadius: 2,
  },
  dot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotConnected: {
    backgroundColor: GamesPalette.amberAccent,
    borderColor: GamesPalette.amberAccent,
  },
  dotNumber: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '800',
    color: GamesPalette.navyAccent,
  },
  dotNumberConnected: {
    color: '#FFFFFF',
  },
});
