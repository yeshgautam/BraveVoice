// Full-bleed ice-lane bowling background (immersiveBackground mode) — the ball rolls up the
// lane on success and the pins scatter; a miss gives a gentle short roll that stops short and
// resets. Built on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';
import { ParticleBurst } from '@/game-engine/ParticleBurst';

function BowlingStage({ phase, lastResult, resultRevealKey }: GameStageProps) {
  const [strikeCount, setStrikeCount] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const ballY = useSharedValue(0);
  const pinsScale = useSharedValue(1);
  const pinsOpacity = useSharedValue(1);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      ballY.value = withSequence(withTiming(-360, { duration: 700, easing: Easing.out(Easing.cubic) }), withDelay(500, withTiming(0, { duration: 0 })));
      pinsScale.value = withSequence(withTiming(1.3, { duration: 160 }), withTiming(0.4, { duration: 260 }), withDelay(700, withTiming(1, { duration: 0 })));
      pinsOpacity.value = withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 260 }), withDelay(700, withTiming(1, { duration: 0 })));
      setBurstKey((k) => k + 1);
      setStrikeCount((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      ballY.value = withSequence(withTiming(-70, { duration: 320, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const ballStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ballY.value }] }));
  const pinsStyle = useAnimatedStyle(() => ({ transform: [{ scale: pinsScale.value }], opacity: pinsOpacity.value }));

  return (
    <View style={styles.stage}>
      <View style={styles.strikeBadge}>
        <Text style={styles.strikeText}>🎳 {strikeCount}</Text>
      </View>
      <Animated.View style={[styles.pinsSlot, pinsStyle]} />
      <View style={styles.ballLane}>
        <Animated.View style={[styles.ball, ballStyle]} />
        <View style={styles.particleOverlay} pointerEvents="none">
          <ParticleBurst burstKey={burstKey} size={160} colors={['#FFFFFF', GamesPalette.amberAccent, '#4DABF7']} />
        </View>
      </View>
    </View>
  );
}

export function BowlingGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="bowling"
        categoryKey={categoryKey}
        title="Bowling"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to roll the ball down the lane!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        immersiveBackground
        resultCompleteText="Five strikes in a row! 🎉"
        resultPartialText={(s) => `You knocked down ${s} of 5 frames!`}
        renderStage={(stageProps) => (
          <View style={StyleSheet.absoluteFillObject}>
            <Image
              source={require('@/assets/images/game-bg/penguin-bowling-play.jpg')}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            <BowlingStage {...stageProps} />
          </View>
        )}
      />
      <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
  },
  strikeBadge: {
    position: 'absolute',
    top: 170,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  strikeText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  pinsSlot: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    width: 40,
    height: 40,
  },
  ballLane: {
    position: 'absolute',
    bottom: '18%',
    alignSelf: 'center',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3F2D7A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
