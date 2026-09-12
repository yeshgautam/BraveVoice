// Shared per-game home/menu screen shell. Every "older mode" game gets one of these in
// front of its gameplay screen: full-bleed real artwork background, a real stat readout
// (username, streak, best stars, badge tier — all pulled from useProgress/useOnboarding,
// nothing invented), and a PLAY button. Deliberately does NOT show currency, a fake
// "Level", a shop, or multiplayer — BraveVoice has no such systems, and this screen only
// ever displays numbers that are true.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { bestStarsToTier, GameBadge } from '@/components/games/game-badge';
import { Fonts } from '@/constants/theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useProgress } from '@/contexts/progress-context';

export type GameHomeScreenExtraButton = {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
};

export type GameHomeScreenProps = {
  gameKey: string;
  tagline: string;
  backgroundImage: number;
  badgeSource: number;
  accentColor?: string;
  onPlay: () => void;
  /** When true, the artwork is shown as a full-width hero at its own native aspect ratio
   * (zero cropping/zoom) with the real Play action as an invisible tap-zone over the art's
   * own PLAY graphic, followed by a real icy panel below holding stats + any extra buttons
   * instead of the mockup's fake Tournament/Challenges/Multiplayer rows and icon dock. */
  immersive?: boolean;
  /** Aspect ratio (width / height) of `backgroundImage` when `immersive` — required so the
   * hero renders at its native proportions without cropping. */
  heroAspectRatio?: number;
  /** Real, functional buttons rendered in the panel below the hero (immersive only) — e.g. Garage. */
  extraButtons?: GameHomeScreenExtraButton[];
  /** Renders a gear icon next to the stat pill (immersive only). */
  onSettingsPress?: () => void;
  /** Bold crisp title rendered in the panel (immersive only) — use when the hero art is
   * environment-only (no baked-in logo text) and the game name needs to be shown as real text. */
  title?: string;
  /** When true, renders a real, always-visible Play button in the panel instead of an invisible
   * tap-zone over the hero art. Use whenever the hero art has no baked-in PLAY graphic. */
  showPlayButton?: boolean;
};

export function GameHomeScreen({
  gameKey,
  tagline,
  backgroundImage,
  badgeSource,
  accentColor = '#3E86C4',
  onPlay,
  immersive = false,
  heroAspectRatio = 1.5,
  extraButtons = [],
  onSettingsPress,
  title,
  showPlayButton = false,
}: GameHomeScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { username } = useOnboarding();
  const { streakDays, gameStats } = useProgress();
  const stats = gameStats[gameKey] ?? { bestStars: 0, plays: 0 };
  const tier = bestStarsToTier(stats.bestStars);

  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value * 6 }] }));

  if (immersive) {
    return (
      <View style={styles.root}>
        <View style={[styles.immersiveSafeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topRow}>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={() => router.back()}>
              <Text style={styles.iconButtonText}>← Back</Text>
            </Pressable>
            <View style={styles.topRowRight}>
              <View style={styles.statPill}>
                <Text style={styles.statPillName} numberOfLines={1}>
                  {username.trim() || 'Player'}
                </Text>
                <Text style={styles.statPillSub}>
                  🔥 {streakDays} day{streakDays === 1 ? '' : 's'}
                </Text>
              </View>
              {onSettingsPress && (
                <Pressable
                  style={({ pressed }) => [styles.iconButton, styles.settingsButton, pressed && styles.pressed]}
                  onPress={onSettingsPress}
                  accessibilityRole="button"
                  accessibilityLabel="Settings">
                  <Text style={styles.iconButtonText}>⚙️</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.heroWrap}>
            <Image source={backgroundImage} style={[styles.hero, { aspectRatio: heroAspectRatio }]} contentFit="cover" />
            {!showPlayButton && (
              <Pressable
                style={({ pressed }) => [styles.playHitZone, pressed && styles.playHitZonePressed]}
                onPress={onPlay}
                accessibilityRole="button"
                accessibilityLabel="Play"
              />
            )}
          </View>

          <View style={styles.panel}>
            <LinearGradient colors={['#123A57', '#0B1E33']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.panelInner}>
            {title && <Text style={styles.immersiveTitle}>{title}</Text>}

            <View style={styles.taglineBanner}>
              <Text style={styles.taglineText}>{tagline}</Text>
            </View>

            <View style={styles.badgeRow}>
              <GameBadge source={badgeSource} tier={tier} size={56} showLockIcon />
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeStars}>{stats.bestStars > 0 ? '⭐'.repeat(stats.bestStars) : 'Not played yet'}</Text>
                <Text style={styles.badgePlays}>
                  {stats.plays} {stats.plays === 1 ? 'play' : 'plays'} · {TIER_LABEL[tier]}
                </Text>
              </View>
            </View>

            {extraButtons.map((btn) => (
              <Pressable
                key={btn.key}
                style={({ pressed }) => [styles.extraButton, pressed && styles.pressed]}
                onPress={btn.onPress}>
                <Text style={styles.extraButtonIcon}>{btn.icon}</Text>
                <View style={styles.extraButtonInfo}>
                  <Text style={styles.extraButtonLabel}>{btn.label}</Text>
                  <Text style={styles.extraButtonSubtitle}>{btn.subtitle}</Text>
                </View>
                <Text style={styles.extraButtonChevron}>›</Text>
              </Pressable>
            ))}

            {showPlayButton && (
              <Pressable
                style={({ pressed }) => [styles.playButton, { backgroundColor: accentColor }, pressed && styles.pressed]}
                onPress={onPlay}>
                <Text style={styles.playButtonText}>▶ PLAY</Text>
              </Pressable>
            )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#123A57', '#0B1E33']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.banner}>
        <Image source={backgroundImage} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <View style={styles.bannerScrim} pointerEvents="none" />
        <LinearGradient
          colors={['transparent', 'rgba(11,30,51,0.55)', '#0B1E33']}
          locations={[0, 0.72, 1]}
          style={styles.bannerFade}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.iconButtonText}>← Back</Text>
          </Pressable>
          <View style={styles.statPill}>
            <Text style={styles.statPillName} numberOfLines={1}>
              {username.trim() || 'Player'}
            </Text>
            <Text style={styles.statPillSub}>
              🔥 {streakDays} day{streakDays === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.bottomCard, floatStyle]}>
          <View style={styles.badgeRow}>
            <GameBadge source={badgeSource} tier={tier} size={62} showLockIcon />
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeStars}>{stats.bestStars > 0 ? '⭐'.repeat(stats.bestStars) : 'Not played yet'}</Text>
              <Text style={styles.badgePlays}>
                {stats.plays} {stats.plays === 1 ? 'play' : 'plays'} · {TIER_LABEL[tier]}
              </Text>
            </View>
          </View>

          <View style={styles.taglineBanner}>
            <Text style={styles.taglineText}>{tagline}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.playButton, { backgroundColor: accentColor }, pressed && styles.pressed]}
            onPress={onPlay}>
            <Text style={styles.playButtonText}>▶ PLAY</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const TIER_LABEL: Record<string, string> = {
  locked: 'Not started',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1E33',
  },
  immersiveSafeArea: {
    flex: 1,
  },
  heroWrap: {
    marginTop: 8,
  },
  hero: {
    width: '100%',
  },
  playHitZone: {
    position: 'absolute',
    top: '78%',
    left: '8%',
    right: '8%',
    height: '20%',
    borderRadius: 16,
  },
  playHitZonePressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  immersiveTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(79,168,216,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  panel: {
    flex: 1,
    marginTop: -4,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  panelInner: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  extraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(15,40,66,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.45)',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  extraButtonIcon: {
    fontSize: 28,
  },
  extraButtonInfo: {
    flex: 1,
  },
  extraButtonLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#EAF6FF',
  },
  extraButtonSubtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: '#BFE3F5',
    marginTop: 1,
  },
  extraButtonChevron: {
    fontSize: 22,
    color: 'rgba(234,246,255,0.6)',
    fontWeight: '700',
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    overflow: 'hidden',
  },
  bannerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,16,28,0.15)',
  },
  bannerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconButton: {
    backgroundColor: 'rgba(15,40,66,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.55)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  iconButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: '#EAF6FF',
  },
  statPill: {
    backgroundColor: 'rgba(15,40,66,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.55)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: 170,
    alignItems: 'flex-end',
  },
  statPillName: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '800',
    color: '#EAF6FF',
  },
  statPillSub: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
    color: '#BFE3F5',
    marginTop: 2,
  },
  spacer: {
    flex: 1,
  },
  bottomCard: {
    alignItems: 'center',
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(15,40,66,0.58)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.5)',
    borderRadius: 18,
    padding: 18,
    alignSelf: 'stretch',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeStars: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFE9A8',
  },
  badgePlays: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: '#BFE3F5',
    marginTop: 2,
  },
  taglineBanner: {
    backgroundColor: 'rgba(15,40,66,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.5)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
  },
  taglineText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: '#EAF6FF',
    textAlign: 'center',
  },
  playButton: {
    borderRadius: 32,
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderWidth: 2,
    borderColor: 'rgba(234,246,255,0.8)',
    shadowColor: '#8FD9F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 6,
  },
  playButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
