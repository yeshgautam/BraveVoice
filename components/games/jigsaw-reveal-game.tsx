// Each successful round snaps the next puzzle piece into place, sliding away one of five strips
// that hide the picture until Fin is fully revealed by round 5. A miss leaves the strip in place.
// Built on GameScreen.tsx.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { GamesPalette } from '@/constants/games-theme';
import { categoryKeyForStrategy } from '@/contexts/progress-context';
import { pickPracticeItems } from '@/content/practiceWords';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { GameScreen, GameStageProps } from '@/game-engine/GameScreen';

const STRIPS = 5;

function Strip({ hidden }: { hidden: boolean }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withTiming(hidden ? 1 : 0, { duration: 420 });
  }, [hidden, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.strip, style]} />;
}

function JigsawStage({ lastResult, resultRevealKey }: GameStageProps) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (resultRevealKey === 0) return;
    if (lastResult?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRevealed((c) => Math.min(STRIPS, c + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);

  return (
    <View style={styles.stage}>
      <View style={styles.frame}>
        <Image source={require('@/assets/images/fin-character.png')} style={styles.picture} contentFit="contain" />
        <View style={styles.stripRow} pointerEvents="none">
          {Array.from({ length: STRIPS }, (_, i) => (
            <Strip key={i} hidden={i >= revealed} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function JigsawRevealGame() {
  const { activeStrategy, difficultyTier } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [words] = useState(() => pickPracticeItems(difficultyTier, 5));
  const strategyLabel = STRATEGY_META[activeStrategy].label;
  const categoryKey = categoryKeyForStrategy(strategyLabel) ?? 'easy-onset';

  return (
    <>
      <GameScreen
        gameKey="jigsaw-reveal"
        categoryKey={categoryKey}
        title="Jigsaw Reveal"
        metricType={activeStrategy}
        words={words}
        hint="Say each word to snap a puzzle piece into place!"
        strategyLabel={strategyLabel}
        onStrategyPress={() => setStrategyModalOpen(true)}
        resultCompleteText="You completed the whole puzzle! 🎉"
        resultPartialText={(s) => `You placed ${s} of 5 pieces!`}
        renderStage={(stageProps) => <JigsawStage {...stageProps} />}
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
  frame: {
    width: 210,
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: GamesPalette.cardWhite,
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
  },
  picture: {
    width: '100%',
    height: '100%',
  },
  stripRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  strip: {
    flex: 1,
    height: '100%',
    borderWidth: 1,
    borderColor: GamesPalette.iceBorder,
    backgroundColor: GamesPalette.navyAccent,
  },
});
