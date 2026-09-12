// Cast the line each round: a great word reels a fish up out of the pond with a splash-burst and
// the tally climbs; a miss lets the line come back empty. Built on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';
import { ParticleBurst } from '@/game-engine/ParticleBurst';

function FishingStage({ phase, lastResult, resultRevealKey }: GameStageProps) {
  const [caught, setCaught] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const fishY = useSharedValue(60);
  const fishOpacity = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (phase === 'recording') {
      bob.value = withTiming(-8, { duration: 500 });
    } else if (phase === 'ready') {
      bob.value = withTiming(0, { duration: 300 });
    }
  }, [phase, bob]);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fishOpacity.value = withTiming(1, { duration: 120 });
      fishY.value = withSequence(
        withTiming(-40, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withTiming(60, { duration: 0 })
      );
      fishOpacity.value = withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 0 }));
      setBurstKey((k) => k + 1);
      setCaught((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  const fishStyle = useAnimatedStyle(() => ({ transform: [{ translateY: fishY.value }], opacity: fishOpacity.value }));
  const rodStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <View style={styles.stage}>
      <View style={styles.tallyBadge}>
        <Text style={styles.tallyText}>🐟 {caught}</Text>
      </View>
      <Animated.Text style={[styles.rod, rodStyle]}>🎣</Animated.Text>
      <View style={styles.pond}>
        <Animated.Text style={[styles.fish, fishStyle]}>🐠</Animated.Text>
        <View style={styles.particleOverlay} pointerEvents="none">
          <ParticleBurst burstKey={burstKey} size={150} colors={['#FFFFFF', '#4DABF7', GamesPalette.iceBorder]} />
        </View>
      </View>
    </View>
  );
}

export function FishingDerbyGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="fishing-derby"
        categoryKey={categoryKey}
        title="Fishing Derby"
        metricType={activeStrategy}
        words={words}
        hint="Say the word to cast your line and reel one in!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You caught the whole pond! 🎉"
        resultPartialText={(s) => `You reeled in ${s} of 5 fish!`}
        renderStage={(stageProps) => <FishingStage {...stageProps} />}
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
  tallyBadge: {
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
  tallyText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  rod: {
    fontSize: 60,
    marginBottom: -6,
  },
  pond: {
    width: '100%',
    height: 130,
    backgroundColor: '#AED4F2',
    borderTopWidth: 3,
    borderColor: '#8FC0EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fish: {
    fontSize: 40,
  },
  particleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
