import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClassFluencyLineChart } from '@/components/therapist/line-chart';
import {
  ACHIEVEMENT_BADGES,
  CHILD,
  ENCOURAGEMENT_INSIGHTS,
  FLUENCY_TARGET,
  FLUENCY_TREND,
  FLUENCY_TREND_LABELS,
  STRATEGY_BREAKDOWN,
} from '@/constants/parent-data';
import {
  BodyBold,
  BodyFont,
  BodyMedium,
  BodySemibold,
  ParentPalette,
  TitleFont,
} from '@/constants/parent-theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_W - 40 - 36;

export default function ParentProgressScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const improvement = FLUENCY_TREND[FLUENCY_TREND.length - 1] - FLUENCY_TREND[0];
  const maxStrategyScore = Math.max(...STRATEGY_BREAKDOWN.map((s) => s.score));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Progress</Text>
          <Pressable
            style={styles.dateRangePill}
            onPress={() => Alert.alert('Date Range', 'More date ranges are coming soon.')}>
            <Text style={styles.dateRangePillText}>This Month</Text>
            <Text style={styles.dateRangePillChevron}>▾</Text>
          </Pressable>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Fluency Score Over Time</Text>
          <ClassFluencyLineChart
            width={CHART_WIDTH}
            classAverage={FLUENCY_TREND}
            target={FLUENCY_TARGET}
            xLabels={FLUENCY_TREND_LABELS}
            seriesLabel="Fluency Score"
          />
          <Text style={styles.improvementText}>
            Your child improved {improvement}% this month! 🎉
          </Text>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>STRATEGY BREAKDOWN</Text>
        </View>
        <View style={styles.strategyList}>
          {STRATEGY_BREAKDOWN.map((s) => (
            <View key={s.key} style={styles.strategyCard}>
              <Text style={styles.strategyName}>
                {s.emoji} {s.name}
              </Text>
              <View style={styles.strategyBarRow}>
                <View style={styles.strategyTrack}>
                  <View
                    style={[
                      styles.strategyFill,
                      { width: `${(s.score / Math.max(100, maxStrategyScore)) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.strategyScore}>{s.score}%</Text>
              </View>
              <Text style={styles.strategyMeta}>
                {s.sessions} sessions · Best: {s.bestGame}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>GAME ACHIEVEMENTS</Text>
        </View>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENT_BADGES.map((badge) => (
            <View key={badge.key} style={[styles.badgeCell, !badge.earned && styles.badgeCellLocked]}>
              <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
                {badge.earned ? badge.emoji : '🔒'}
              </Text>
              <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>{badge.name}</Text>
              {badge.earned && <Text style={styles.badgeDate}>{badge.dateEarned}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>AREAS TO ENCOURAGE</Text>
        </View>
        <View style={styles.insightList}>
          {ENCOURAGEMENT_INSIGHTS.map((insight) => (
            <View key={insight.key} style={styles.insightCard}>
              <Text style={styles.insightText}>
                {insight.emoji} {insight.text}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}
          onPress={() => Alert.alert('Download Report', `A progress report for ${CHILD.name} is coming soon.`)}>
          <Text style={styles.downloadButtonText}>Download Progress Report</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ParentPalette.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: TitleFont,
    fontSize: 32,
    color: ParentPalette.textDark,
  },
  dateRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ParentPalette.card,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dateRangePillText: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: ParentPalette.textDark,
  },
  dateRangePillChevron: {
    fontSize: 11,
    color: ParentPalette.textMuted,
  },
  chartCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 18,
    marginTop: 20,
  },
  chartTitle: {
    fontFamily: BodyMedium,
    fontSize: 16,
    color: ParentPalette.textDark,
    marginBottom: 14,
  },
  improvementText: {
    fontFamily: BodyBold,
    fontSize: 14,
    color: ParentPalette.green,
    marginTop: 14,
  },
  pillLabel: {
    alignSelf: 'flex-start',
    backgroundColor: ParentPalette.pillBackground,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 28,
    marginBottom: 14,
  },
  pillLabelText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: ParentPalette.textMuted,
    letterSpacing: 0.5,
  },
  strategyList: {
    gap: 12,
  },
  strategyCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 16,
  },
  strategyName: {
    fontFamily: BodyMedium,
    fontSize: 16,
    color: ParentPalette.textDark,
  },
  strategyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  strategyTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: ParentPalette.background,
    overflow: 'hidden',
  },
  strategyFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: ParentPalette.brandBlue,
  },
  strategyScore: {
    width: 40,
    textAlign: 'right',
    fontFamily: BodySemibold,
    fontSize: 13,
    color: ParentPalette.textDark,
  },
  strategyMeta: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 8,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCell: {
    width: '30%',
    backgroundColor: ParentPalette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  badgeCellLocked: {
    opacity: 0.5,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeEmojiLocked: {
    fontSize: 22,
  },
  badgeName: {
    fontFamily: BodySemibold,
    fontSize: 11,
    color: ParentPalette.textDark,
    textAlign: 'center',
    marginTop: 8,
  },
  badgeNameLocked: {
    color: ParentPalette.textMuted,
  },
  badgeDate: {
    fontFamily: BodyFont,
    fontSize: 10,
    color: ParentPalette.textMuted,
    marginTop: 2,
  },
  insightList: {
    gap: 10,
  },
  insightCard: {
    backgroundColor: ParentPalette.iceLight,
    borderRadius: 16,
    padding: 16,
  },
  insightText: {
    fontFamily: BodyMedium,
    fontSize: 14,
    color: ParentPalette.brandBlue,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  downloadButton: {
    backgroundColor: ParentPalette.card,
    borderWidth: 1.5,
    borderColor: ParentPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  downloadButtonText: {
    fontFamily: TitleFont,
    fontSize: 16,
    color: ParentPalette.brandBlue,
  },
});
