import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { GameBadge } from '@/components/games/game-badge';
import { GAME_CATALOG } from '@/constants/games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { CATEGORY_LABELS, CategoryKey, useProgress } from '@/contexts/progress-context';

const CATEGORY_ORDER: CategoryKey[] = [
  'easy-onset',
  'slow-speech',
  'stretchy-speech',
  'light-contact',
  'cancellation',
];

const TIERS_PER_GAME = 3;
const TOTAL_BADGES = CATEGORY_ORDER.reduce((sum, key) => sum + GAME_CATALOG[key].length * TIERS_PER_GAME, 0);

export function PinsYoungScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { gameStats } = useProgress();

  const earnedBadges = CATEGORY_ORDER.reduce((sum, key) => {
    return (
      sum +
      GAME_CATALOG[key].reduce((catSum, game) => {
        const bestStars = gameStats[game.key]?.bestStars ?? 0;
        return catSum + Math.min(TIERS_PER_GAME, bestStars);
      }, 0)
    );
  }, 0);
  const earnedRatio = TOTAL_BADGES > 0 ? earnedBadges / TOTAL_BADGES : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BraveVoiceHeader />
      <Text style={styles.title}>My Badges 🏅</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.headerCardText}>
            {earnedBadges} / {TOTAL_BADGES} badges earned
          </Text>
          <View style={styles.headerTrack}>
            <View style={[styles.headerFill, { width: `${earnedRatio * 100}%` }]} />
          </View>
        </View>

        <Text style={styles.subtitle}>Play a game to win Bronze, Silver &amp; Gold!</Text>

        {CATEGORY_ORDER.map((categoryKey) => (
          <View key={categoryKey} style={styles.categorySection}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{CATEGORY_LABELS[categoryKey].toUpperCase()}</Text>
            </View>

            {GAME_CATALOG[categoryKey].map((game) => {
              const bestStars = gameStats[game.key]?.bestStars ?? 0;
              return (
                <View key={game.key} style={styles.gameSection}>
                  <Text style={styles.gameHeader}>{game.title}</Text>
                  <View style={styles.gameBadgeRow}>
                    <View style={styles.gameBadgeItem}>
                      <GameBadge
                        source={game.badge}
                        tier={bestStars >= 1 ? 'bronze' : 'locked'}
                        size={68}
                        showLockIcon
                      />
                      <Text style={styles.tierLabel}>Bronze</Text>
                    </View>
                    <View style={styles.gameBadgeItem}>
                      <GameBadge
                        source={game.badge}
                        tier={bestStars >= 2 ? 'silver' : 'locked'}
                        size={68}
                        showLockIcon
                      />
                      <Text style={styles.tierLabel}>Silver</Text>
                    </View>
                    <View style={styles.gameBadgeItem}>
                      <GameBadge
                        source={game.badge}
                        tier={bestStars >= 3 ? 'gold' : 'locked'}
                        size={68}
                        showLockIcon
                      />
                      <Text style={styles.tierLabel}>Gold</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
    paddingTop: 8,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
    marginTop: 10,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  headerCardText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  headerTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 10,
    overflow: 'hidden',
  },
  headerFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#F5C842',
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  categorySection: {
    marginTop: 22,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  categoryPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
    letterSpacing: 0.5,
  },
  gameSection: {
    marginBottom: 22,
  },
  gameHeader: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginBottom: 12,
  },
  gameBadgeRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    justifyContent: 'space-around',
  },
  gameBadgeItem: {
    alignItems: 'center',
  },
  tierLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.subtitle,
    marginTop: 8,
  },
});
