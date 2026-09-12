import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClassFluencyLineChart } from '@/components/therapist/line-chart';
import {
  STRATEGY_PERFORMANCE,
  STUDENTS,
  WEEKDAY_LABELS_SHORT,
  WEEKLY_CLASS_AVERAGE,
  WEEKLY_TARGET_SCORE,
} from '@/constants/therapist-data';
import { BodyBold, BodyFont, BodySemibold, TherapistPalette, TitleFont } from '@/constants/therapist-theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_W - 40 - 36;

const SUMMARY = [
  { key: 'sessions', value: '24', label: 'Total Sessions' },
  { key: 'fluency', value: '78%', label: 'Average Fluency' },
  { key: 'strategy', value: 'Easy Onset', label: 'Most Practiced' },
];

function attentionTier(score: number): 'coral' | 'yellow' | null {
  if (score < 50) return 'coral';
  if (score < 70) return 'yellow';
  return null;
}

export default function TherapistReportsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const maxStrategyScore = Math.max(...STRATEGY_PERFORMANCE.map((s) => s.score));
  const attentionStudents = STUDENTS.map((s) => ({ ...s, tier: attentionTier(s.fluencyScore) })).filter(
    (s) => s.tier !== null
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.title}>Reports</Text>
          <Pressable
            style={styles.dateRangePill}
            onPress={() => Alert.alert('Date Range', 'More date ranges are coming soon.')}>
            <Text style={styles.dateRangePillText}>This Week</Text>
            <Text style={styles.dateRangePillChevron}>▾</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          {SUMMARY.map((card) => (
            <View key={card.key} style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>CLASS FLUENCY OVER TIME</Text>
        </View>
        <View style={styles.chartCard}>
          <ClassFluencyLineChart
            width={CHART_WIDTH}
            classAverage={WEEKLY_CLASS_AVERAGE}
            target={WEEKLY_TARGET_SCORE}
            xLabels={WEEKDAY_LABELS_SHORT}
          />
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>STRATEGY PERFORMANCE</Text>
        </View>
        <View style={styles.chartCard}>
          {STRATEGY_PERFORMANCE.map((s) => (
            <View key={s.key} style={styles.barRow}>
              <Text style={styles.barLabel}>{s.label}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(s.score / Math.max(100, maxStrategyScore)) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barScore}>{s.score}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>STUDENTS NEEDING ATTENTION</Text>
        </View>
        <View style={styles.attentionList}>
          {attentionStudents.map((student) => (
            <View key={student.id} style={styles.attentionCard}>
              <View style={styles.attentionInfo}>
                <Text style={styles.attentionName}>{student.name}</Text>
                <Text style={styles.attentionMeta}>
                  {student.fluencyScore}% fluency · {student.lastActive.replace('Active ', 'Last active ')}
                </Text>
              </View>
              <View
                style={[
                  styles.attentionBadge,
                  { backgroundColor: student.tier === 'coral' ? TherapistPalette.coral : TherapistPalette.yellow },
                ]}>
                <Text style={styles.attentionBadgeText}>{student.tier === 'coral' ? 'Alert' : 'Warning'}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
          onPress={() => Alert.alert('Export Report', 'Export is coming soon.')}>
          <Text style={styles.exportButtonText}>Export Report</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TherapistPalette.background,
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
    color: TherapistPalette.textDark,
  },
  dateRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TherapistPalette.card,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dateRangePillText: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: TherapistPalette.textDark,
  },
  dateRangePillChevron: {
    fontSize: 11,
    color: TherapistPalette.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: TitleFont,
    fontSize: 18,
    color: TherapistPalette.textDark,
    textAlign: 'center',
  },
  summaryLabel: {
    fontFamily: BodyFont,
    fontSize: 11,
    color: TherapistPalette.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  pillLabel: {
    alignSelf: 'flex-start',
    backgroundColor: TherapistPalette.pillBackground,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 28,
    marginBottom: 14,
  },
  pillLabelText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    letterSpacing: 0.5,
  },
  chartCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 18,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  barLabel: {
    width: 100,
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.textDark,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: TherapistPalette.background,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: TherapistPalette.brandBlue,
  },
  barScore: {
    width: 36,
    textAlign: 'right',
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.textDark,
  },
  attentionList: {
    gap: 10,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TherapistPalette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 14,
  },
  attentionInfo: {
    flex: 1,
  },
  attentionName: {
    fontFamily: BodySemibold,
    fontSize: 14,
    color: TherapistPalette.textDark,
  },
  attentionMeta: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    marginTop: 2,
  },
  attentionBadge: {
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  attentionBadgeText: {
    fontFamily: BodyBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  exportButton: {
    backgroundColor: TherapistPalette.card,
    borderWidth: 1.5,
    borderColor: TherapistPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  exportButtonText: {
    fontFamily: TitleFont,
    fontSize: 16,
    color: TherapistPalette.brandBlue,
  },
});
