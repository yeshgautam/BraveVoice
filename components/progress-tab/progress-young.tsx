import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { CATEGORY_LABELS, CategoryKey, useProgress, xpToStars } from '@/contexts/progress-context';

const CATEGORY_ORDER: CategoryKey[] = [
  'stretchy-speech',
  'light-contact',
  'cancellation',
  'easy-onset',
  'slow-speech',
];

const CATEGORY_ICONS: Record<CategoryKey, number> = {
  'stretchy-speech': require('@/assets/images/badge-rainbow-stretch.png'),
  'light-contact': require('@/assets/images/badge-feather-touch.png'),
  cancellation: require('@/assets/images/badge-ice-rebuild.png'),
  'easy-onset': require('@/assets/images/badge-bubble-pop.png'),
  'slow-speech': require('@/assets/images/badge-ice-clock.png'),
};

function progressLabel(progress: number) {
  if (progress <= 0) return 'Not started';
  if (progress < 0.5) return 'Getting started!';
  if (progress < 1) return 'Almost there!';
  return 'All done! 🎉';
}

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

export function ProgressYoungScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { streakDays, totalXP, categoryProgress } = useProgress();
  const totalStars = xpToStars(totalXP);
  const weeklyCalendar = getWeeklyCalendar(streakDays);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BraveVoiceHeader />
      <Text style={styles.title}>My Progress 📈</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{streakDays}</Text>
            <Text style={styles.summaryLabel}>{streakDays === 1 ? 'Day Streak' : 'Day Streak'}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>⭐ {totalStars}</Text>
            <Text style={styles.summaryLabel}>My Stars</Text>
          </View>
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>MY SKILLS</Text>
        </View>

        <View style={styles.categoryList}>
          {CATEGORY_ORDER.map((key) => {
            const progress = categoryProgress[key];
            return (
              <View key={key} style={styles.categoryCard}>
                <Image source={CATEGORY_ICONS[key]} style={styles.categoryIcon} contentFit="contain" />
                <View style={styles.categoryText}>
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryTitle}>{CATEGORY_LABELS[key]}</Text>
                    <Text style={styles.categoryPercent}>
                      {progressLabel(progress)} — {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  <View style={styles.categoryTrack}>
                    <View style={[styles.categoryFill, { width: `${progress * 100}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>THIS WEEK AT A GLANCE</Text>
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

        <View style={styles.totalStarsCard}>
          <Text style={styles.totalStarsEmoji}>⭐</Text>
          <Text style={styles.totalStarsNumber}>{totalStars} stars</Text>
          <Text style={styles.totalStarsHint}>Keep practicing to earn more!</Text>
        </View>

        {totalXP === 0 && (
          <Text style={styles.emptyHint}>Play a game to start earning stars! ⭐</Text>
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
    fontSize: 28,
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
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  summaryNumber: {
    fontFamily: Fonts.rounded,
    fontSize: 34,
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
  categoryList: {
    gap: 14,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  categoryIcon: {
    width: 52,
    height: 52,
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
    fontSize: 15,
    fontWeight: '700',
    color: OnboardingPalette.title,
    flexShrink: 1,
  },
  categoryPercent: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
    marginLeft: 8,
  },
  categoryTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 8,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: OnboardingPalette.progressActive,
  },
  emptyHint: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 24,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 15,
  },
  weekDayLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    color: OnboardingPalette.subtitle,
  },
  totalStarsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 26,
  },
  totalStarsEmoji: {
    fontSize: 40,
  },
  totalStarsNumber: {
    fontFamily: Fonts.rounded,
    fontSize: 32,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 6,
  },
  totalStarsHint: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    marginTop: 4,
  },
});
