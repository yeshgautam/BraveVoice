// Shared Fin mascot for every plain-RN screen (games built outside the Skia diorama kit,
// content screens like the daily check-in and "It's OK to Stutter"). This is deliberately
// separate from arcticScene.tsx's Skia-canvas FinCharacter, which only exists inside a
// <Canvas> and can't be dropped into a normal View tree.
//
// We only have one Fin illustration per pose in the asset set (no distinct celebrating/
// encouraging frames), so each state is expressed as motion on the same image rather than a
// frame swap — idle breathes gently, celebrating bounces + tilts, encouraging sways with a
// soft head-tilt, listening leans in and holds. All transitions are spring-based.
//
// Equipped Rewards → Customize Fin cosmetics render automatically (emoji-overlay placeholders —
// see content/finItems.ts) so unlocking a hat actually shows up everywhere Fin appears, which is
// the whole point of the reward. Pass `hideCustomization` for the rare spot where that would be
// inappropriate (none currently need it, but the escape hatch costs nothing).

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { findFinItem } from '@/content/finItems';
import { useRewardsState } from '@/contexts/rewards-context';

export type FinState = 'idle' | 'celebrating' | 'encouraging' | 'listening' | 'thinking';

const SPRING_BOUNCY = { damping: 9, stiffness: 180, mass: 0.7 };
const SPRING_GENTLE = { damping: 14, stiffness: 120, mass: 0.8 };

export function FinCharacter({
  state,
  size = 170,
  hideCustomization = false,
}: {
  state: FinState;
  size?: number;
  hideCustomization?: boolean;
}) {
  const { equippedFinItemKeys } = useRewardsState();
  const bounceY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scale = useSharedValue(1);
  const breathe = useSharedValue(0);

  // Continuous idle breathing loop, always running underneath whatever state-specific
  // motion is layered on top — keeps Fin from ever looking frozen.
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [breathe]);

  useEffect(() => {
    switch (state) {
      case 'celebrating':
        bounceY.value = withSequence(
          withTiming(-22, { duration: 140, easing: Easing.out(Easing.quad) }),
          withSpring(0, SPRING_BOUNCY)
        );
        tilt.value = withSequence(
          withTiming(-8, { duration: 120 }),
          withTiming(8, { duration: 160 }),
          withTiming(-4, { duration: 140 }),
          withSpring(0, SPRING_GENTLE)
        );
        scale.value = withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, SPRING_BOUNCY));
        break;
      case 'encouraging':
        bounceY.value = withSpring(0, SPRING_GENTLE);
        tilt.value = withRepeat(withSequence(withTiming(-6, { duration: 500 }), withTiming(6, { duration: 500 })), 3, true);
        scale.value = withSpring(1, SPRING_GENTLE);
        break;
      case 'listening':
        bounceY.value = withSpring(-4, SPRING_GENTLE);
        tilt.value = withSpring(10, SPRING_GENTLE);
        scale.value = withSpring(1.04, SPRING_GENTLE);
        break;
      case 'thinking':
        // A slow, continuous side-to-side rock — "pondering" rather than listening's single
        // held lean or encouraging's brisk 3x sway. Loops for as long as processing takes.
        bounceY.value = withSpring(-2, SPRING_GENTLE);
        tilt.value = withRepeat(withSequence(withTiming(-9, { duration: 420 }), withTiming(9, { duration: 420 })), -1, true);
        scale.value = withRepeat(withSequence(withTiming(1.03, { duration: 420 }), withTiming(0.99, { duration: 420 })), -1, true);
        break;
      case 'idle':
      default:
        bounceY.value = withSpring(0, SPRING_GENTLE);
        tilt.value = withSpring(0, SPRING_GENTLE);
        scale.value = withSpring(1, SPRING_GENTLE);
        break;
    }
  }, [state, bounceY, tilt, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceY.value - breathe.value * 4 },
      { rotate: `${tilt.value}deg` },
      { scale: scale.value + breathe.value * 0.015 },
    ],
  }));

  const height = size * (219 / 170);
  const hatItem = !hideCustomization && equippedFinItemKeys.hat ? findFinItem(equippedFinItemKeys.hat) : undefined;
  const accessoryItem = !hideCustomization && equippedFinItemKeys.accessory ? findFinItem(equippedFinItemKeys.accessory) : undefined;
  const backgroundItem = !hideCustomization && equippedFinItemKeys.background ? findFinItem(equippedFinItemKeys.background) : undefined;

  return (
    <View style={[styles.wrap, { width: size, height }]}>
      {backgroundItem && (
        <Text style={[styles.backgroundIcon, { fontSize: size * 0.95 }]} pointerEvents="none">
          {backgroundItem.icon}
        </Text>
      )}
      <Animated.View style={animatedStyle}>
        <Image source={require('@/assets/images/fin-character.png')} style={{ width: size, height }} contentFit="contain" />
      </Animated.View>
      {hatItem && (
        <Text style={[styles.hatIcon, { fontSize: size * 0.24, top: height * 0.01 }]} pointerEvents="none">
          {hatItem.icon}
        </Text>
      )}
      {accessoryItem && (
        <Text style={[styles.accessoryIcon, { fontSize: size * 0.2, top: height * 0.48 }]} pointerEvents="none">
          {accessoryItem.icon}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundIcon: {
    position: 'absolute',
    opacity: 0.22,
  },
  hatIcon: {
    position: 'absolute',
  },
  accessoryIcon: {
    position: 'absolute',
  },
});
