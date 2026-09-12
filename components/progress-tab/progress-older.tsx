import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { BadgeTier, bestStarsToTier, TIER_STYLES } from '@/components/games/game-badge';
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

type DayStatus = 'practiced' | 'today' | 'future';

function getWeeklyCalendar(streakDays: number): { label: string; status: DayStatus }[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = (new Date().getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
  return labels.map((label, i) => {
    if (i === todayIndex) return { label, status: 'today' as const };
    if (i < todayIndex) {
      return { label, status: todayIndex - i <= streakDays ? ('practiced' as const) : ('future' as const) };
    }
    return { label, status: 'future' as const };
  });
}

export function ProgressOlderScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { streakDays, totalXP, gameStats } = useProgress();
  const weeklyCalendar = getWeeklyCalendar(streakDays);

  const earnedGames = NEW_GAMES_CATALOG.filter((g) => (gameStats[g.key]?.bestStars ?? 0) >= 1);

  type Achievement = { key: string; icon: string; tier: 'bronze' | 'silver' | 'gold'; name: string; date: string };
  const achievements: Achievement[] = earnedGames.slice(0, 2).map((g) => {
    const tier = bestStarsToTier(gameStats[g.key]?.bestStars ?? 0) as 'bronze' | 'silver' | 'gold';
    const tierLabel = tier === 'gold' ? 'Gold' : tier === 'silver' ? 'Silver' : 'Bronze';
    return {
      key: `game-${g.key}`,
      icon: g.icon,
      tier,
      name: `${g.title} ${tierLabel} 🏅`,
      date: 'Earned today',
    };
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BraveVoiceHeader />
      <Text style={styles.title}>Progress</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>🔥 {streakDays}</Text>
            <Text style={styles.summaryLabel}>Day Streak</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>⭐ {totalXP}</Text>
            <Text style={styles.summaryLabel}>Total XP</Text>
          </View>
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>WEEKLY ACTIVITY</Text>
        </View>
        <View style={styles.weekRow}>
          {weeklyCalendar.map((day) => (
            <View key={day.label} style={styles.weekDayColumn}>
              <View
                style={[
                  styles.weekDayCircle,
                  day.status === 'practiced' && styles.weekDayCirclePracticed,
                  day.status === 'today' && styles.weekDayCircleToday,
                  day.status === 'future' && styles.weekDayCircleFuture,
                ]}>
                {day.status === 'practiced' && <Text style={styles.weekDayCheck}>✓</Text>}
              </View>
              <Text style={styles.weekDayLabel}>{day.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>MY GAMES</Text>
        </View>

        <View style={styles.categoryList}>
          {NEW_GAMES_CATALOG.slice(0, 6).map((game) => {
            const bestStars = gameStats[game.key]?.bestStars ?? 0;
            const isComplete = bestStars >= 3;
            return (
              <View key={game.key} style={styles.categoryCard}>
                <Text style={styles.categoryEmoji}>{game.icon}</Text>
                <View style={styles.categoryText}>
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryTitle}>{game.title}</Text>
                    <Text style={styles.categoryPercent}>{'⭐'.repeat(bestStars) || '—'}</Text>
                  </View>
                  <View style={styles.categoryTrack}>
                    <View style={[styles.categoryFill, { width: `${(bestStars / 3) * 100}%` }]} />
                  </View>
                  <Text style={[styles.categoryStatus, isComplete && styles.categoryStatusComplete]}>
                    {isComplete ? 'All done! 🎉' : (gameStats[game.key]?.plays ?? 0) > 0 ? 'In progress' : 'Not started'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {totalXP === 0 && (
          <Text style={styles.emptyHint}>Play a game to start earning XP.</Text>
        )}

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>RECENT ACHIEVEMENTS</Text>
        </View>
        {achievements.length > 0 ? (
          <View style={styles.achievementRow}>
            {achievements.map((achievement) => (
              <View key={achievement.key} style={styles.achievementCard}>
                <EmojiBadge icon={achievement.icon} tier={achievement.tier} size={56} />
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDate}>{achievement.date}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyHint}>Earn your first badge by completing a game!</Text>
        )}
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
    paddingTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  summaryNumber: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  summaryLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 4,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 26,
    marginBottom: 14,
  },
  sectionPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  weekDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCirclePracticed: {
    backgroundColor: OnboardingPalette.progressActive,
  },
  weekDayCircleToday: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8724A',
  },
  weekDayCircleFuture: {
    backgroundColor: OnboardingPalette.speechBubble,
  },
  weekDayCheck: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    fontSize: 14,
  },
  weekDayLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    color: OnboardingPalette.subtitle,
  },
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
  },
  categoryEmoji: {
    fontSize: 32,
    width: 44,
    textAlign: 'center',
  },
  categoryText: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.title,
    flexShrink: 1,
  },
  categoryPercent: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
    marginLeft: 8,
  },
  categoryTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 8,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: OnboardingPalette.progressActive,
  },
  categoryStatus: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    marginTop: 6,
  },
  categoryStatusComplete: {
    color: '#2E8B57',
  },
  emptyHint: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 24,
  },
  achievementRow: {
    flexDirection: 'row',
    gap: 12,
  },
  achievementCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  achievementName: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  achievementDate: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    color: OnboardingPalette.subtitle,
    marginTop: 4,
  },
});
