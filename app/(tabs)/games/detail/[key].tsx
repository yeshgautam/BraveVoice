// Screen B — Game Detail. Shown for every game in both age modes before Play. Under-8 games
// route straight to their existing, unchanged gameplay screen; 8+ games route to the new
// Screen C router (real Tic-Tac-Toe, or an honest "Coming soon" for the rest).

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { ALL_GAMES_ORDERED } from '@/constants/games-catalog';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';

export default function GameDetailScreen() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { activeStrategy } = useStrategy();
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);

  // Look up by key in both catalogs regardless of mode: a strategy game (young originals) routes to
  // its legacy screen, while a classic/board game routes to the new play screen — so the designed
  // games work in young mode too, not just 8+.
  const youngEntry = ALL_GAMES_ORDERED.find((g) => g.key === key);
  const newEntry = youngEntry ? undefined : NEW_GAMES_CATALOG.find((g) => g.key === key);

  if (!youngEntry && !newEntry) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>Game not found</Text>
          <Pressable style={({ pressed }) => [styles.playButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.playButtonText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const title = youngEntry?.title ?? newEntry?.title ?? '';
  const howToPlay = youngEntry?.howToPlay ?? newEntry?.howToPlay ?? '';

  const handlePlay = () => {
    if (youngEntry) {
      router.push(`/(tabs)/games/${youngEntry.key}` as never);
    } else if (newEntry) {
      router.push(`/(tabs)/games/play/${newEntry.key}` as never);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        {youngEntry ? (
          <Image source={youngEntry.badge} style={styles.iconImage} contentFit="contain" />
        ) : (
          <View style={styles.iconEmojiWrap}>
            <Text style={styles.iconEmoji}>{newEntry?.icon}</Text>
          </View>
        )}

        <Text style={styles.title}>{title}</Text>

        <View style={styles.howToPlayCard}>
          <Text style={styles.howToPlayLabel}>How to play</Text>
          <Text style={styles.howToPlayText}>{howToPlay}</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.strategyRow, pressed && styles.pressed]} onPress={() => setStrategyModalOpen(true)}>
          <View>
            <Text style={styles.strategyLabel}>Strategy</Text>
            <Text style={styles.strategyValue}>{STRATEGY_META[activeStrategy].label}</Text>
          </View>
          <Text style={styles.strategyChangeText}>Change ›</Text>
        </Pressable>
      </View>

      <Pressable style={({ pressed }) => [styles.playButton, pressed && styles.pressed]} onPress={handlePlay}>
        <Text style={styles.playButtonText}>▶ Play</Text>
      </Pressable>

      <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: OnboardingPalette.progressActive,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  iconImage: {
    width: 130,
    height: 122,
  },
  iconEmojiWrap: {
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: '#EAF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 64,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  howToPlayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    padding: 16,
    alignSelf: 'stretch',
  },
  howToPlayLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '800',
    color: OnboardingPalette.subtitle,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  howToPlayText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: OnboardingPalette.title,
    lineHeight: 21,
  },
  strategyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    padding: 16,
    alignSelf: 'stretch',
  },
  strategyLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingPalette.subtitle,
  },
  strategyValue: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 2,
  },
  strategyChangeText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  playButton: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
  },
  playButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
