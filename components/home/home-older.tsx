import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { getLevelProgress } from '@/constants/older-levels';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useProgress } from '@/contexts/progress-context';

const SEASON_TOTAL_GAMES = NEW_GAMES_CATALOG.length;

export function HomeOlderScreen() {
  const router = useRouter();
  const { username, resetOnboarding } = useOnboarding();
  const { streakDays, totalXP, todayXP, gameStats } = useProgress();
  const tabBarHeight = useBottomTabBarHeight();
  const name = username.trim() || 'Player';
  const initials = name.slice(0, 2).toUpperCase();

  const { level, levelNumber } = getLevelProgress(totalXP);

  const seasonGamesComplete = NEW_GAMES_CATALOG.filter((g) => (gameStats[g.key]?.bestStars ?? 0) >= 1).length;
  const seasonRatio = SEASON_TOTAL_GAMES > 0 ? seasonGamesComplete / SEASON_TOTAL_GAMES : 0;

  const gamesPlayed = NEW_GAMES_CATALOG.filter((g) => (gameStats[g.key]?.plays ?? 0) > 0).length;
  const hasTripleStarAny = NEW_GAMES_CATALOG.some((g) => (gameStats[g.key]?.bestStars ?? 0) === 3);
  const practiceMinutes = Math.min(5, Math.floor(todayXP / 20));

  const quests = [
    {
      key: 'speech-sprint',
      icon: '🎯',
      color: '#E8724A',
      name: 'Speech Sprint',
      description: 'Complete 2 games today',
      xp: 50,
      progress: Math.min(2, gamesPlayed),
      target: 2,
    },
    {
      key: 'perfect-round',
      icon: '🏆',
      color: '#F5C842',
      name: 'Perfect Round',
      description: 'Get 3 stars on any game',
      xp: 75,
      progress: hasTripleStarAny ? 1 : 0,
      target: 1,
    },
    {
      key: 'keep-streak',
      icon: '🔥',
      color: '#1A6FA8',
      name: 'Keep the Streak',
      description: 'Practice for 5 minutes today',
      xp: 30,
      progress: practiceMinutes,
      target: 5,
      unit: ' minutes',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <BraveVoiceHeader />

        <View style={styles.playerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{name}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>
                ⚔️ {level.name} · Level {levelNumber}
              </Text>
            </View>
          </View>
          <View style={styles.playerStats}>
            <Text style={styles.playerStreak}>🔥 {streakDays}</Text>
            <Text style={styles.playerXP}>{totalXP} XP</Text>
          </View>
        </View>

        <LinearGradient
          colors={['#2380BE', '#123F5C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seasonBanner}>
          <Text style={styles.seasonTitle}>❄️ SEASON 1 — THE BIG FREEZE</Text>
          <View style={styles.seasonTrack}>
            <View style={[styles.seasonFill, { width: `${seasonRatio * 100}%` }]} />
          </View>
          <Text style={styles.seasonCount}>
            {seasonGamesComplete} / {SEASON_TOTAL_GAMES} games complete
          </Text>
          <Text style={styles.seasonHint}>Unlock Season 2: The Thaw by completing all 20 games</Text>
        </LinearGradient>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>DAILY QUESTS</Text>
        </View>
        <View style={styles.questList}>
          {quests.map((quest) => {
            const isComplete = quest.progress >= quest.target;
            const ratio = Math.min(1, quest.progress / quest.target);
            return (
              <View key={quest.key} style={styles.questCard}>
                <View style={styles.questTopRow}>
                  <View style={[styles.questIconCircle, { backgroundColor: quest.color + '26' }]}>
                    <Text style={styles.questIconEmoji}>{quest.icon}</Text>
                  </View>
                  <View style={styles.questText}>
                    <Text style={styles.questName}>{quest.name}</Text>
                    <Text style={styles.questDescription}>{quest.description}</Text>
                  </View>
                  <View style={styles.questReward}>
                    {isComplete ? (
                      <Text style={styles.questDoneText}>✅ Done! +{quest.xp} XP</Text>
                    ) : (
                      <Text style={styles.questRewardText}>+{quest.xp} XP</Text>
                    )}
                  </View>
                </View>
                <View style={styles.questTrack}>
                  <View
                    style={[
                      styles.questFill,
                      { width: `${ratio * 100}%` },
                      isComplete && styles.questFillComplete,
                    ]}
                  />
                </View>
                <Text style={styles.questProgressLabel}>
                  {quest.progress}/{quest.target}
                  {quest.unit ?? ''}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionPillRow}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>MY GAMES</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/games' as never)}>
            <Text style={styles.seeAllText}>See all ›</Text>
          </Pressable>
        </View>
        <View style={styles.skillList}>
          {NEW_GAMES_CATALOG.slice(0, 5).map((game) => {
            const stats = gameStats[game.key];
            const bestStars = stats?.bestStars ?? 0;
            const isComplete = bestStars >= 3;
            return (
              <Pressable
                key={game.key}
                style={({ pressed }) => [styles.skillCard, pressed && styles.pressed]}
                onPress={() => router.push(`/(tabs)/games/detail/${game.key}` as never)}>
                <View style={styles.skillIconWrap}>
                  <Text style={styles.skillIconEmoji}>{game.icon}</Text>
                </View>
                <View style={styles.skillText}>
                  <View style={styles.skillTitleRow}>
                    <Text style={styles.skillName}>{game.title}</Text>
                    <Text style={styles.skillPercent}>{'⭐'.repeat(bestStars) || '—'}</Text>
                  </View>
                  <View style={styles.skillTrack}>
                    <View style={[styles.skillFill, { width: `${(bestStars / 3) * 100}%` }]} />
                  </View>
                  <Text style={[styles.skillStatus, isComplete && styles.skillStatusComplete]}>
                    {isComplete ? 'All done! 🎉' : (stats?.plays ?? 0) > 0 ? 'In progress' : 'Not started'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.devResetButton, pressed && styles.pressed]}
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding/welcome');
          }}>
          <Text style={styles.devResetButtonText}>↺ Restart Onboarding (dev)</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  pressed: {
    opacity: 0.85,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '800',
    color: OnboardingPalette.progressActive,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: OnboardingPalette.speechBubble,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  levelBadgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  playerStats: {
    alignItems: 'flex-end',
    gap: 6,
  },
  playerStreak: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  playerXP: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: '#F5C842',
  },
  seasonBanner: {
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
  },
  seasonTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  seasonTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 14,
    overflow: 'hidden',
  },
  seasonFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  seasonCount: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  seasonHint: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
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
  sectionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  skillIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillIconEmoji: {
    fontSize: 20,
  },
  sectionPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
    letterSpacing: 0.5,
  },
  questList: {
    gap: 12,
  },
  questCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
  },
  questTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questIconEmoji: {
    fontSize: 20,
  },
  questText: {
    flex: 1,
  },
  questName: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  questDescription: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
    marginTop: 2,
  },
  questReward: {
    alignItems: 'flex-end',
  },
  questRewardText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  questDoneText: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    color: '#2E8B57',
  },
  questTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: OnboardingPalette.background,
    marginTop: 10,
    overflow: 'hidden',
  },
  questFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: OnboardingPalette.progressActive,
  },
  questFillComplete: {
    backgroundColor: '#2E8B57',
  },
  questProgressLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 10,
    color: OnboardingPalette.subtitle,
    marginTop: 4,
    textAlign: 'right',
  },
  skillList: {
    gap: 10,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    gap: 12,
  },
  skillText: {
    flex: 1,
  },
  skillTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  skillPercent: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  skillTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 6,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: OnboardingPalette.progressActive,
  },
  skillStatus: {
    fontFamily: Fonts.rounded,
    fontSize: 10,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    marginTop: 4,
  },
  skillStatusComplete: {
    color: '#2E8B57',
  },
  devResetButton: {
    alignSelf: 'center',
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  devResetButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
  },
});
