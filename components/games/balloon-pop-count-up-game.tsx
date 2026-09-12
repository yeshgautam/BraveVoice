// Balloon inflates while recording, pops with a burst on success (count climbs), and settles
// gently back down on a miss. Built on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';
import { ParticleBurst } from '@/game-engine/ParticleBurst';

const BALLOON_COLORS = [GamesPalette.amberAccent, GamesPalette.navyAccent, '#FF8FA3', '#7ED9C3', '#FFD166'];

function BalloonStage({ phase, roundIndex, lastResult, resultRevealKey }: GameStageProps) {
  const [count, setCount] = useState(0);
  const [popKey, setPopKey] = useState(0);
  const scale = useSharedValue(0.6);
  const visible = useSharedValue(1);

  useEffect(() => {
    if (phase === 'recording') {
      scale.value = withTiming(1.15, { duration: 2600, easing: Easing.out(Easing.quad) });
    } else if (phase === 'ready') {
      scale.value = withTiming(0.6, { duration: 220 });
      visible.value = withTiming(1, { duration: 0 });
    }
  }, [phase, scale, visible]);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSequence(withTiming(1.4, { duration: 120 }), withTiming(0, { duration: 80 }));
      visible.value = withTiming(0, { duration: 200 });
      setPopKey((k) => k + 1);
      setCount((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      scale.value = withSpring(0.6, { damping: 8, stiffness: 140 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const balloonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: visible.value,
  }));

  return (
    <View style={styles.stage}>
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>🎈 {count}</Text>
      </View>
      <View style={styles.balloonWrap}>
        <Animated.View style={[styles.balloon, { backgroundColor: BALLOON_COLORS[roundIndex % BALLOON_COLORS.length] }, balloonStyle]}>
          <View style={styles.balloonHighlight} />
        </Animated.View>
        <View style={styles.particleOverlay} pointerEvents="none">
          <ParticleBurst burstKey={popKey} size={160} colors={[BALLOON_COLORS[roundIndex % BALLOON_COLORS.length], '#FFFFFF']} />
        </View>
      </View>
    </View>
  );
}

export function BalloonPopCountUpGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="balloon-pop-count-up"
        categoryKey={categoryKey}
        title="Balloon Pop Count-Up"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to pop a balloon!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You popped every balloon! 🎉"
        resultPartialText={(s) => `You popped ${s} of 5 balloons!`}
        renderStage={(stageProps) => <BalloonStage {...stageProps} />}
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
  counterBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GamesPalette.iceBorder,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  counterText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  balloonWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloon: {
    width: 90,
    height: 110,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloonHighlight: {
    width: 20,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginLeft: -20,
    marginTop: -20,
  },
});
