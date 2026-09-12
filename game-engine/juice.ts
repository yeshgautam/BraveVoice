// Shared "game feel" primitives. This is a toolkit, not a framework — every mini-game
// composes these into its own bespoke visuals rather than expecting one call to make an
// object feel alive by itself. See the usage examples at the bottom of this file.
//
// The six principles this file operationalizes:
//   1. Anticipation      — withAnticipation()
//   2. Squash & stretch   — withSquashPulse() / withStretchPulse() / squashStretchScale()
//   3. Easing             — withOrganic() (spring) / withMechanical() (bezier) — never linear
//   4. Screen response    — useScreenBounce()
//   5. Particle payoff    — PARTICLE_THEMES + useSuccessBurstKey() (pairs with ParticleBurst)
//   6. Sound + haptic     — juiceFeedback.{attemptStart,success,retry,impact}()

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { playSound } from '@/game-engine/SoundManager';

/* ------------------------------- 1. Anticipation --------------------------------------- */

/**
 * A small counter-motion before the main action resolves, e.g. pulling back before
 * launching forward. Assign the result directly to a shared value:
 *   arrowX.value = withAnticipation(-8, 140);
 */
export function withAnticipation(
  pullBackTo: number,
  mainTarget: number,
  opts: { pullMs?: number; spring?: WithSpringConfig } = {}
) {
  const { pullMs = 130, spring = SPRING_SNAPPY } = opts;
  return withSequence(
    withTiming(pullBackTo, { duration: pullMs, easing: Easing.out(Easing.quad) }),
    withSpring(mainTarget, spring)
  );
}

/* ------------------------------ 2. Squash & stretch ------------------------------------- */

export const SQUASH_ON_IMPACT = 0.32;
export const STRETCH_ON_LAUNCH = 0.28;

/** Timeline for a squash-then-recover bounce (e.g. a ball landing). Drive scale from the
 * returned progress value via `squashStretchScale()`. */
export function withSquashPulse(amount = SQUASH_ON_IMPACT) {
  return withSequence(
    withTiming(amount, { duration: 70, easing: Easing.out(Easing.quad) }),
    withSpring(0, SPRING_BOUNCY)
  );
}

/** Timeline for a stretch-then-recover pulse (e.g. an object accelerating away). */
export function withStretchPulse(amount = STRETCH_ON_LAUNCH) {
  return withSequence(
    withTiming(-amount, { duration: 90, easing: Easing.out(Easing.cubic) }),
    withSpring(0, SPRING_BOUNCY)
  );
}

/**
 * Turns a squash/stretch pulse value (negative = squashed, positive = stretched) into a
 * non-uniform scale pair. `axis` is the direction of travel/impact — e.g. an arrow flying
 * horizontally stretches along 'x'; a ball landing squashes along 'y'.
 *
 * Marked as a worklet: this runs on the UI thread from inside a caller's useAnimatedStyle,
 * not on the JS thread — calling it from a worklet without this directive throws at runtime.
 */
export function squashStretchScale(pulse: number, axis: 'x' | 'y' = 'y') {
  'worklet';
  const primary = 1 + pulse;
  const secondary = 1 - pulse * 0.6;
  return axis === 'y' ? { scaleX: secondary, scaleY: primary } : { scaleX: primary, scaleY: secondary };
}

/* ---------------------------------- 3. Easing ------------------------------------------- */

/** Bezier "snap" curve for anything mechanical (levers, mechanisms, rigid UI chrome). */
export const MECHANICAL_EASING = Easing.bezier(0.65, 0, 0.35, 1);

export const SPRING_BOUNCY: WithSpringConfig = { damping: 9, stiffness: 140, mass: 0.6 };
export const SPRING_SNAPPY: WithSpringConfig = { damping: 16, stiffness: 220, mass: 0.5 };
export const SPRING_GENTLE: WithSpringConfig = { damping: 14, stiffness: 90, mass: 0.8 };

/** Organic/bouncy motion — anything that should feel alive: characters, projectiles, payoffs. */
export function withOrganic(toValue: number, spring: WithSpringConfig = SPRING_BOUNCY) {
  return withSpring(toValue, spring);
}

/** Mechanical motion — anything rigid: levers, gauges, mechanisms. Bezier, never linear. */
export function withMechanical(toValue: number, durationMs = 260, timing: WithTimingConfig = {}) {
  return withTiming(toValue, { duration: durationMs, easing: MECHANICAL_EASING, ...timing });
}

/* ------------------------------ 4. Screen response --------------------------------------- */

/**
 * Whole-play-area micro-bounce on success — a subtle camera-shake-style response. Wrap the
 * play area's root View in the returned `style` and call `bounce()` when a round succeeds.
 */
export function useScreenBounce() {
  const translateY = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const bounce = () => {
    translateY.value = withSequence(
      withTiming(-4, { duration: 60, easing: Easing.out(Easing.quad) }),
      withSpring(0, SPRING_BOUNCY)
    );
  };

  return { style, bounce };
}

/* ------------------------------ 5. Particle payoff ---------------------------------------- */

/** Theme-matched palettes for <ParticleBurst colors={...} /> — pick the one matching a game's setting. */
export const PARTICLE_THEMES = {
  ice: ['#BFE8FF', '#FFFFFF', '#8FD3F4', '#D6EDF8'],
  gold: ['#FFD166', '#F0B429', '#FFFFFF', '#FCEFC7'],
  ember: ['#FFB347', '#FF6B6B', '#FFD166', '#FFFFFF'],
} as const;

/**
 * Turns GameStageProps' `resultRevealKey` + `lastResult?.success` into a burst-only-on-
 * success trigger for <ParticleBurst burstKey={...} />, so a failed round never plays
 * confetti. `resultRevealKey === 0` is GameScreen's "nothing has happened yet" sentinel.
 */
export function useSuccessBurstKey(resultRevealKey: number, success: boolean | null | undefined) {
  const [burstKey, setBurstKey] = useState(0);
  useEffect(() => {
    if (resultRevealKey === 0 || !success) return;
    setBurstKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultRevealKey]);
  return burstKey;
}

/* --------------------------- 6. Sound + haptic pairing -------------------------------------- */

function fireHaptic(kind: 'light' | 'medium' | 'soft' | 'success') {
  switch (kind) {
    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    case 'soft':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

/**
 * Every state change pairs a sound with a haptic — never fire one without the other. This
 * is the ONE place games trigger feedback for attempt-start/success/retry/impact so every
 * game sounds and feels consistent.
 */
export const juiceFeedback = {
  /** Mic tap — the child is about to attempt a word. */
  attemptStart(): void {
    playSound('buttonTap');
    fireHaptic('light');
  },
  /** Round succeeded — pair with useScreenBounce().bounce() and a ParticleBurst. */
  success(): void {
    playSound('success');
    fireHaptic('success');
  },
  /** Round needs another try — gentle, never punishing. */
  retry(): void {
    playSound('tryAgain'); // no-ops until a real neutral tone exists — see SoundManager.ts
    fireHaptic('soft');
  },
  /** A physical impact beat mid-animation (e.g. release, strike, landing) distinct from the
   * final success/retry outcome. */
  impact(): void {
    playSound('whoosh');
    fireHaptic('medium');
  },
};

/* ============================== USAGE EXAMPLES ==========================================

// Example 1 — Anticipation + mechanical easing (a cue pulling back before striking a ball):
//
//   const cueX = useSharedValue(0);
//   function strike() {
//     cueX.value = withAnticipation(12, -140, { pullMs: 110 }); // pull back, then snap forward
//   }
//   const cueStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cueX.value }] }));

// Example 2 — Squash & stretch on impact, driven by a single pulse value:
//
//   const pulse = useSharedValue(0);
//   function onLanding() {
//     pulse.value = withSquashPulse();
//   }
//   const ballStyle = useAnimatedStyle(() => {
//     const { scaleX, scaleY } = squashStretchScale(pulse.value, 'y');
//     return { transform: [{ scaleX }, { scaleY }] };
//   });

// Example 3 — Full round-success orchestration inside a game's Stage component:
//
//   function ArcheryStage({ phase, resultRevealKey, lastResult }: GameStageProps) {
//     const { style: bounceStyle, bounce } = useScreenBounce();
//     const burstKey = useSuccessBurstKey(resultRevealKey, lastResult?.success);
//
//     useEffect(() => {
//       if (resultRevealKey === 0) return;
//       if (lastResult?.success) {
//         bounce();
//         juiceFeedback.success();
//       } else {
//         juiceFeedback.retry();
//       }
//     }, [resultRevealKey]);
//
//     return (
//       <Animated.View style={[StyleSheet.absoluteFill, bounceStyle]}>
//         {...scene...}
//         <ParticleBurst burstKey={burstKey} colors={PARTICLE_THEMES.gold} />
//       </Animated.View>
//     );
//   }

============================================================================================ */
