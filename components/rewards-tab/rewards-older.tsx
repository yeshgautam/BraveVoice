import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeTier, TIER_STYLES } from '@/components/games/game-badge';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { getLevelProgress } from '@/constants/older-levels';
import { useProgress } from '@/contexts/progress-context';
import { STRATEGIES } from '@/contexts/strategy-context';

function EmojiBadge({ icon, tier, size = 64, showLockIcon = false }: { icon: string; tier: BadgeTier; size?: number; showLockIcon?: boolean }) {
  const colors = TIER_STYLES[tier];
  return (
    <View
      style={[
        emojiBadgeStyles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.border, backgroundColor: colors.background },
      ]}>
      <Text style={{ fontSize: size * 0.45, opacity: tier === 'locked' ? 0.35 : 1 }}>{icon}</Text>
      {showLockIcon && tier === 'locked' && <Text style={emojiBadgeStyles.lock}>🔒</Text>}
    </View>
  );
}

const emojiBadgeStyles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 14,
  },
});

const PALETTE = {
  background: '#EEF6FB',
  card: '#FFFFFF',
  brandBlue: '#1A6FA8',
  coral: '#E8724A',
  yellow: '#F5C842',
  textDark: '#1A2A3A',
  textMuted: '#7A9AB0',
  border: '#C8DFF0',
};

const TITLE_FONT = 'FredokaOne_400Regular';
const BODY_FONT = 'Nunito_400Regular';
const BODY_SEMIBOLD = 'Nunito_600SemiBold';
const BODY_BOLD = 'Nunito_700Bold';
const BODY_EXTRABOLD = 'Nunito_800ExtraBold';

const TIERS_PER_GAME = 3;

type BadgeContext = {
  totalGamesPlayed: number;
  streakDays: number;
  hasTripleStarAny: boolean;
  threeGamesMastered: boolean;
  fivePerfectishSessions: boolean;
  allGamesCompleted: boolean;
};

type Badge = {
  key: string;
  emoji: string;
  name: string;
  description: string;
  earned: (ctx: BadgeContext) => boolean;
};

const BADGES: Badge[] = [
  {
    key: 'first-strike',
    emoji: '🎯',
    name: 'First Strike',
    description: 'Completed your first game',
    earned: (c) => c.totalGamesPlayed >= 1,
  },
  {
    key: 'on-fire',
    emoji: '🔥',
    name: 'On Fire',
    description: '7 day streak',
    earned: (c) => c.streakDays >= 7,
  },
  {
    key: 'triple-star',
    emoji: '⭐',
    name: 'Triple Star',
    description: 'Got 3 stars on any game',
    earned: (c) => c.hasTripleStarAny,
  },
  {
    key: 'triple-threat',
    emoji: '🏆',
    name: 'Triple Threat',
    description: '3 stars on 3 different games',
    earned: (c) => c.threeGamesMastered,
  },
  {
    key: 'smooth-talker',
    emoji: '🌊',
    name: 'Smooth Talker',
    description: '5 sessions with strong scores',
    earned: (c) => c.fivePerfectishSessions,
  },
  {
    key: 'ice-legend',
    emoji: '🧊',
    name: 'Ice Legend',
    description: 'Completed every game',
    earned: (c) => c.allGamesCompleted,
  },
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function RewardsOlderScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { totalXP, todayXP, streakDays, gameStats } = useProgress();

  const waveRotate = useSharedValue(0);
  useEffect(() => {
    waveRotate.value = withRepeat(
      withSequence(
        withTiming(16, { duration: 220 }),
        withTiming(-10, { duration: 220 }),
        withTiming(16, { duration: 220 }),
        withTiming(0, { duration: 220 })
      ),
      -1,
      false
    );
  }, [waveRotate]);
  const waveStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${waveRotate.value}deg` }] }));

  const { level, levelNumber, next, ratio } = getLevelProgress(totalXP);

  const totalGamesPlayed = NEW_GAMES_CATALOG.filter((g) => (gameStats[g.key]?.plays ?? 0) > 0).length;
  const hasTripleStarAny = NEW_GAMES_CATALOG.some((g) => (gameStats[g.key]?.bestStars ?? 0) === 3);
  const threeGamesMastered = NEW_GAMES_CATALOG.filter((g) => (gameStats[g.key]?.bestStars ?? 0) === 3).length >= 3;
  const totalSessionsPlayed = NEW_GAMES_CATALOG.reduce((sum, g) => sum + (gameStats[g.key]?.plays ?? 0), 0);
  const overallAvgStars =
    NEW_GAMES_CATALOG.reduce((sum, g) => sum + (gameStats[g.key]?.bestStars ?? 0), 0) / NEW_GAMES_CATALOG.length;
  const fivePerfectishSessions = totalSessionsPlayed >= 5 && overallAvgStars >= 2.5;
  const allGamesCompleted = totalGamesPlayed === NEW_GAMES_CATALOG.length;

  const badgeContext: BadgeContext = {
    totalGamesPlayed,
    streakDays,
    hasTripleStarAny,
    threeGamesMastered,
    fivePerfectishSessions,
    allGamesCompleted,
  };

  const today = new Date().getDay();

  const totalGameBadges = NEW_GAMES_CATALOG.length * TIERS_PER_GAME;
  const earnedGameBadges = NEW_GAMES_CATALOG.reduce(
    (sum, g) => sum + Math.min(TIERS_PER_GAME, gameStats[g.key]?.bestStars ?? 0),
    0
  );
  const earnedGameBadgeRatio = totalGameBadges > 0 ? earnedGameBadges / totalGameBadges : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleSpacer} />
          <Text style={styles.pageTitle}>Rewards</Text>
          <View style={styles.finWrap}>
            <Animated.View style={waveStyle}>
              <Image
                source={require('@/assets/images/fin-avatar.png')}
                style={styles.finImage}
                contentFit="contain"
              />
            </Animated.View>
          </View>
        </View>

        {/* Season Progress */}
        <View style={styles.seasonCard}>
          <Text style={styles.seasonTitle}>❄️ Season 1 — The Big Freeze</Text>
          <View style={styles.seasonTrack}>
            <View style={[styles.seasonFill, { width: `${(totalGamesPlayed / NEW_GAMES_CATALOG.length) * 100}%` }]} />
          </View>
          <Text style={styles.seasonCount}>
            {totalGamesPlayed} / {NEW_GAMES_CATALOG.length} games complete
          </Text>
          <Text style={styles.seasonHint}>Complete all {NEW_GAMES_CATALOG.length} games to unlock Season 2 — The Thaw! 🌊</Text>
        </View>

        {/* Section 1: Current Level */}
        <View style={styles.levelCard}>
          <Image
            source={require('@/assets/images/fin-avatar.png')}
            style={styles.levelFin}
            contentFit="contain"
          />
          <View style={styles.levelInfo}>
            <Text style={styles.levelName}>{level.name}</Text>
            <Text style={styles.levelNumber}>Level {levelNumber}</Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${ratio * 100}%` }]} />
            </View>
            <Text style={styles.xpText}>
              {next ? `${totalXP} / ${next.xpRequired} XP to ${next.name}` : `${totalXP} XP — max level!`}
            </Text>
          </View>
        </View>

        {/* Section 2: Strategy path */}
        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>STRATEGY PATH</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}>
          {STRATEGIES.map((strategy) => (
            <View key={strategy.key} style={styles.categoryCard}>
              <Text style={styles.categoryStars}>{strategy.icon}</Text>
              <Text style={styles.categoryName}>{strategy.label}</Text>
              <Text style={styles.categoryCount}>{strategy.description}</Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.seasonFooter}>Complete all {NEW_GAMES_CATALOG.length} games to unlock Season 2 — The Thaw</Text>

        {/* Section 3: Game badges (Bronze/Silver/Gold per game) */}
        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>GAME BADGES</Text>
        </View>
        <View style={styles.gameBadgeHeaderCard}>
          <Text style={styles.gameBadgeHeaderText}>
            {earnedGameBadges} / {totalGameBadges} badges earned
          </Text>
          <View style={styles.gameBadgeHeaderTrack}>
            <View style={[styles.gameBadgeHeaderFill, { width: `${earnedGameBadgeRatio * 100}%` }]} />
          </View>
        </View>

        <View style={styles.gameBadgeCategorySection}>
          {NEW_GAMES_CATALOG.map((game) => {
            const bestStars = gameStats[game.key]?.bestStars ?? 0;
            return (
              <View key={game.key} style={styles.gameBadgeGameSection}>
                <Text style={styles.gameBadgeGameTitle}>{game.title}</Text>
                <View style={styles.gameBadgeRow}>
                  <View style={styles.gameBadgeItem}>
                    <EmojiBadge icon={game.icon} tier={bestStars >= 1 ? 'bronze' : 'locked'} size={64} showLockIcon />
                    <Text style={styles.gameBadgeTierLabel}>Bronze</Text>
                  </View>
                  <View style={styles.gameBadgeItem}>
                    <EmojiBadge icon={game.icon} tier={bestStars >= 2 ? 'silver' : 'locked'} size={64} showLockIcon />
                    <Text style={styles.gameBadgeTierLabel}>Silver</Text>
                  </View>
                  <View style={styles.gameBadgeItem}>
                    <EmojiBadge icon={game.icon} tier={bestStars >= 3 ? 'gold' : 'locked'} size={64} showLockIcon />
                    <Text style={styles.gameBadgeTierLabel}>Gold</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Section 3b: Achievements */}
        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>ACHIEVEMENTS</Text>
        </View>
        <View style={styles.badgeGrid}>
          {BADGES.map((badge) => {
            const earned = badge.earned(badgeContext);
            return (
              <View key={badge.key} style={styles.badgeCard}>
                <View style={[styles.badgeFrame, !earned && styles.badgeFrameLocked]}>
                  <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>{badge.emoji}</Text>
                  {!earned && <Text style={styles.badgeLock}>🔒</Text>}
                </View>
                <Text style={[styles.badgeName, !earned && styles.badgeTextLocked]}>{badge.name}</Text>
                <Text style={[styles.badgeDescription, !earned && styles.badgeTextLocked]}>
                  {badge.description}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Section 4: Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakTitle}>{streakDays} Day Streak</Text>
          <Text style={styles.streakSubtitle}>Keep practicing daily to grow your streak!</Text>
          <View style={styles.dayRow}>
            {WEEKDAY_LABELS.map((label, i) => {
              const isToday = i === today;
              const isCompleted = !isToday && i < today && today - i <= streakDays;
              const todayHasPractice = isToday && todayXP > 0;
              return (
                <View key={i} style={styles.dayItem}>
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && styles.dayCircleToday,
                      (isCompleted || todayHasPractice) && !isToday && styles.dayCircleCompleted,
                    ]}>
                    {isCompleted && <Text style={styles.dayCheck}>✓</Text>}
                    {todayHasPractice && <Text style={styles.dayCheckToday}>✓</Text>}
                  </View>
                  <Text style={styles.dayLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleSpacer: {
    width: 44,
  },
  pageTitle: {
    flex: 1,
    fontFamily: TITLE_FONT,
    fontSize: 36,
    color: PALETTE.textDark,
    textAlign: 'center',
  },
  finWrap: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
  },
  finImage: {
    width: 44,
    height: 44,
  },

  // Season progress
  seasonCard: {
    backgroundColor: PALETTE.brandBlue,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
  },
  seasonTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  seasonTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 14,
    overflow: 'hidden',
  },
  seasonFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  seasonCount: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  seasonHint: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },

  // Game badges (Bronze/Silver/Gold per game)
  gameBadgeHeaderCard: {
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  gameBadgeHeaderText: {
    fontFamily: TITLE_FONT,
    fontSize: 15,
    color: PALETTE.textDark,
    textAlign: 'center',
  },
  gameBadgeHeaderTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: PALETTE.background,
    marginTop: 10,
    overflow: 'hidden',
  },
  gameBadgeHeaderFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: PALETTE.yellow,
  },
  gameBadgeCategorySection: {
    marginTop: 20,
  },
  gameBadgeCategoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3ECF2',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  gameBadgeCategoryPillText: {
    fontFamily: BODY_BOLD,
    fontSize: 11,
    color: PALETTE.textMuted,
    letterSpacing: 0.5,
  },
  gameBadgeGameSection: {
    marginBottom: 16,
  },
  gameBadgeGameTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 15,
    color: PALETTE.textDark,
    marginBottom: 10,
  },
  gameBadgeRow: {
    flexDirection: 'row',
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingVertical: 14,
    justifyContent: 'space-around',
  },
  gameBadgeItem: {
    alignItems: 'center',
  },
  gameBadgeTierLabel: {
    fontFamily: BODY_SEMIBOLD,
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 6,
  },

  // Section 1
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PALETTE.brandBlue,
    padding: 18,
    marginTop: 18,
    gap: 16,
  },
  levelFin: {
    width: 64,
    height: 64,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontFamily: TITLE_FONT,
    fontSize: 28,
    color: PALETTE.textDark,
  },
  levelNumber: {
    fontFamily: BODY_FONT,
    fontSize: 16,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  xpTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: PALETTE.background,
    marginTop: 12,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: PALETTE.brandBlue,
  },
  xpText: {
    fontFamily: BODY_FONT,
    fontSize: 14,
    color: PALETTE.textMuted,
    marginTop: 8,
  },

  // Pill section label
  pillLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3ECF2',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 28,
    marginBottom: 14,
  },
  pillLabelText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 12,
    color: PALETTE.textMuted,
    letterSpacing: 0.5,
  },

  // Section 2
  categoryScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  categoryCard: {
    width: 132,
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
    padding: 14,
  },
  categoryName: {
    fontFamily: BODY_BOLD,
    fontSize: 14,
    color: PALETTE.textDark,
  },
  categoryStars: {
    fontSize: 16,
    marginTop: 10,
  },
  categoryCount: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 8,
  },
  seasonFooter: {
    fontFamily: BODY_FONT,
    fontSize: 13,
    color: PALETTE.textMuted,
    marginTop: 12,
  },

  // Section 3
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '31%',
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  badgeFrame: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: PALETTE.yellow,
    backgroundColor: '#FFF9E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFrameLocked: {
    borderColor: PALETTE.border,
    backgroundColor: '#F1F5F8',
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeEmojiLocked: {
    opacity: 0.3,
  },
  badgeLock: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 16,
  },
  badgeName: {
    fontFamily: TITLE_FONT,
    fontSize: 14,
    color: PALETTE.textDark,
    marginTop: 10,
    textAlign: 'center',
  },
  badgeDescription: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  badgeTextLocked: {
    color: '#AEC2CF',
  },

  // Section 4
  streakCard: {
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PALETTE.yellow,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginTop: 28,
    alignItems: 'center',
  },
  streakFlame: {
    fontSize: 40,
  },
  streakTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 32,
    color: PALETTE.textDark,
    marginTop: 6,
  },
  streakSubtitle: {
    fontFamily: BODY_FONT,
    fontSize: 14,
    color: PALETTE.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
  },
  dayItem: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: PALETTE.yellow,
    borderColor: PALETTE.yellow,
  },
  dayCircleToday: {
    backgroundColor: PALETTE.brandBlue,
    borderColor: PALETTE.brandBlue,
  },
  dayCheck: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 14,
    color: '#FFFFFF',
  },
  dayCheckToday: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 14,
    color: '#FFFFFF',
  },
  dayLabel: {
    fontFamily: BODY_SEMIBOLD,
    fontSize: 12,
    color: PALETTE.textMuted,
  },
});
