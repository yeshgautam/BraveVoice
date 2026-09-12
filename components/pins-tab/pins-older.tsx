import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { BadgeTier, TIER_STYLES } from '@/components/games/game-badge';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useProgress } from '@/contexts/progress-context';

function EmojiBadge({ icon, tier, size = 64 }: { icon: string; tier: BadgeTier; size?: number }) {
  const colors = TIER_STYLES[tier];
  return (
    <View
      style={[
        emojiBadgeStyles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.border, backgroundColor: colors.background },
      ]}>
      <Text style={{ fontSize: size * 0.45, opacity: tier === 'locked' ? 0.35 : 1 }}>{icon}</Text>
    </View>
  );
}

const emojiBadgeStyles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function PinsOlderScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { gameStats } = useProgress();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BraveVoiceHeader />
      <Text style={styles.title}>Achievements</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Earn Bronze, Silver &amp; Gold in every game</Text>

        {NEW_GAMES_CATALOG.map((game) => {
          const bestStars = gameStats[game.key]?.bestStars ?? 0;
          return (
            <View key={game.key} style={styles.gameSection}>
              <Text style={styles.gameHeader}>{game.title}</Text>
              <View style={styles.gameBadgeRow}>
                <View style={styles.gameBadgeItem}>
                  <EmojiBadge icon={game.icon} tier={bestStars >= 1 ? 'bronze' : 'locked'} size={64} />
                  <Text style={styles.tierLabel}>Bronze</Text>
                </View>
                <View style={styles.gameBadgeItem}>
                  <EmojiBadge icon={game.icon} tier={bestStars >= 2 ? 'silver' : 'locked'} size={64} />
                  <Text style={styles.tierLabel}>Silver</Text>
                </View>
                <View style={styles.gameBadgeItem}>
                  <EmojiBadge icon={game.icon} tier={bestStars >= 3 ? 'gold' : 'locked'} size={64} />
                  <Text style={styles.tierLabel}>Gold</Text>
                </View>
              </View>
            </View>
          );
        })}
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
    fontSize: 26,
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
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginBottom: 22,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    fontFamily: Fonts.rounded,
    fontSize: 19,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginBottom: 12,
  },
  gameSection: {
    marginBottom: 14,
  },
  gameHeader: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: OnboardingPalette.subtitle,
    marginBottom: 8,
  },
  gameBadgeRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    justifyContent: 'space-around',
  },
  gameBadgeItem: {
    alignItems: 'center',
  },
  tierLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingPalette.subtitle,
    marginTop: 6,
  },
});
