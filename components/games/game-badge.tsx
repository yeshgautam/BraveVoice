import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

export type BadgeTier = 'locked' | 'bronze' | 'silver' | 'gold';

export const TIER_STYLES: Record<
  BadgeTier,
  { border: string; background: string; accent: string; label: string }
> = {
  locked: { border: '#D7DAE2', background: '#EDEFF3', accent: '#C3C8D1', label: 'Locked' },
  bronze: { border: '#C97C3F', background: '#F5E1CC', accent: '#8B5A2B', label: 'Bronze' },
  silver: { border: '#AEB7C2', background: '#EAEDF1', accent: '#7C8894', label: 'Silver' },
  gold: { border: '#F0B429', background: '#FCEFC7', accent: '#C98A0E', label: 'Gold' },
};

const ACCENT_ANGLES_DEG = [45, 135, 225, 315];

export function bestStarsToTier(bestStars: number): BadgeTier {
  if (bestStars >= 3) return 'gold';
  if (bestStars >= 2) return 'silver';
  if (bestStars >= 1) return 'bronze';
  return 'locked';
}

export function GameBadge({
  source,
  tier,
  size = 64,
  showLockIcon = false,
}: {
  source: number;
  tier: BadgeTier;
  size?: number;
  showLockIcon?: boolean;
}) {
  const colors = TIER_STYLES[tier];
  const outerPad = size * 0.09;
  const outerSize = size + outerPad * 2;
  const outerRadius = outerSize / 2;
  const dotSize = Math.max(6, size * 0.14);

  return (
    <View
      style={[
        styles.outer,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerRadius,
          borderColor: colors.accent,
        },
      ]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}>
        <Image
          source={source}
          style={[{ width: size * 0.72, height: size * 0.72 }, tier === 'locked' && styles.locked]}
          contentFit="contain"
        />
        {tier === 'locked' && showLockIcon && (
          <Text style={[styles.lockIcon, { fontSize: size * 0.36 }]}>🔒</Text>
        )}
      </View>

      {tier !== 'locked' &&
        ACCENT_ANGLES_DEG.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const left = outerRadius + outerRadius * Math.cos(rad) - dotSize / 2;
          const top = outerRadius + outerRadius * Math.sin(rad) - dotSize / 2;
          return (
            <View
              key={deg}
              style={[
                styles.accentDot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: colors.accent,
                  left,
                  top,
                },
              ]}
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  locked: {
    opacity: 0.35,
  },
  lockIcon: {
    position: 'absolute',
  },
});
