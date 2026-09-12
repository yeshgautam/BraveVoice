import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CHILD,
  PARENT_NAME,
  SUMMARY_CARDS,
  TODAYS_HOMEWORK,
  WEEKLY_CALENDAR,
} from '@/constants/parent-data';
import {
  BodyBold,
  BodyExtrabold,
  BodyFont,
  BodyMedium,
  BodySemibold,
  ParentPalette,
  TitleFont,
} from '@/constants/parent-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function ParentHomeScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { resetOnboarding } = useOnboarding();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.greeting}>Hi, {PARENT_NAME}</Text>
          <View style={styles.topBarIcons}>
            <View style={styles.finCircle}>
              <Text style={styles.finEmoji}>🐧</Text>
            </View>
            <Pressable
              style={styles.iconButton}
              onPress={() => Alert.alert('Notifications', 'No new notifications right now.')}>
              <Text style={styles.iconButtonEmoji}>🔔</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.childCard}>
          <View style={styles.childCardTop}>
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>{CHILD.initials}</Text>
            </View>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{CHILD.name}</Text>
              <Text style={styles.childMode}>
                {CHILD.mode} · Age {CHILD.age}
              </Text>
              <View style={styles.childBadgeRow}>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeText}>🔥 {CHILD.streakDays} Day Streak</Text>
                </View>
              </View>
              <Text style={styles.lastActive}>{CHILD.lastActiveLabel}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.viewProgressButton, pressed && styles.pressed]}
            onPress={() => router.push('/parent/progress' as never)}>
            <Text style={styles.viewProgressButtonText}>View Full Progress</Text>
          </Pressable>
        </View>

        <View style={styles.summaryGrid}>
          {SUMMARY_CARDS.map((card) => (
            <View key={card.key} style={styles.summaryCard}>
              <Text style={styles.summaryAccent}>{card.accent}</Text>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>TODAY&apos;S HOMEWORK</Text>
        </View>
        <View style={styles.homeworkList}>
          {TODAYS_HOMEWORK.map((item) => (
            <View key={item.key} style={styles.homeworkCard}>
              <Text style={styles.homeworkStatusIcon}>{item.completed ? '✅' : '⭕️'}</Text>
              <View style={styles.homeworkInfo}>
                <Text style={styles.homeworkStrategy}>
                  {item.icon} {item.strategy}
                </Text>
                <Text style={styles.homeworkGame}>{item.gameName}</Text>
                <Text style={styles.homeworkMeta}>
                  {item.completed
                    ? `${item.dateLabel} · ${item.fluencyScore}% fluency · ${item.timeSpent}`
                    : item.dateLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.encourageButton, pressed && styles.pressed]}
          onPress={() => Alert.alert('Reminder Sent!', `${CHILD.name} will get a nudge to practice.`)}>
          <Text style={styles.encourageButtonText}>Remind {CHILD.name} to Practice! 🎯</Text>
        </Pressable>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>THIS WEEK AT A GLANCE</Text>
        </View>
        <View style={styles.weekRow}>
          {WEEKLY_CALENDAR.map((day) => (
            <View key={day.label} style={styles.weekDayColumn}>
              <View
                style={[
                  styles.weekDayCircle,
                  day.status === 'practiced' && styles.weekDayCirclePracticed,
                  day.status === 'today' && styles.weekDayCircleToday,
                  day.status === 'upcoming' && styles.weekDayCircleUpcoming,
                ]}>
                {day.status === 'practiced' && <Text style={styles.weekDayCheck}>✓</Text>}
              </View>
              <Text style={styles.weekDayLabel}>{day.label}</Text>
            </View>
          ))}
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
    backgroundColor: ParentPalette.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: BodyFont,
    fontSize: 22,
    color: ParentPalette.textDark,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  finCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ParentPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finEmoji: {
    fontSize: 22,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ParentPalette.card,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonEmoji: {
    fontSize: 18,
  },
  childCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 18,
    marginTop: 20,
  },
  childCardTop: {
    flexDirection: 'row',
    gap: 14,
  },
  childAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ParentPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontFamily: TitleFont,
    fontSize: 22,
    color: ParentPalette.brandBlue,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontFamily: TitleFont,
    fontSize: 24,
    color: ParentPalette.textDark,
  },
  childMode: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 2,
  },
  childBadgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  streakBadge: {
    backgroundColor: ParentPalette.yellow,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  streakBadgeText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: ParentPalette.textDark,
  },
  lastActive: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 8,
  },
  viewProgressButton: {
    backgroundColor: ParentPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  viewProgressButtonText: {
    fontFamily: BodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  summaryCard: {
    width: '47.5%',
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 16,
  },
  summaryAccent: {
    fontSize: 16,
  },
  summaryValue: {
    fontFamily: TitleFont,
    fontSize: 32,
    color: ParentPalette.textDark,
    marginTop: 6,
  },
  summaryLabel: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 4,
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
    fontFamily: BodyExtrabold,
    fontSize: 12,
    color: ParentPalette.textMuted,
    letterSpacing: 0.5,
  },
  homeworkList: {
    gap: 12,
  },
  homeworkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 14,
    gap: 12,
  },
  homeworkStatusIcon: {
    fontSize: 22,
  },
  homeworkInfo: {
    flex: 1,
  },
  homeworkStrategy: {
    fontFamily: BodyMedium,
    fontSize: 16,
    color: ParentPalette.textDark,
  },
  homeworkGame: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: ParentPalette.textMuted,
    marginTop: 2,
  },
  homeworkMeta: {
    fontFamily: BodySemibold,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 4,
  },
  encourageButton: {
    backgroundColor: ParentPalette.coral,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  encourageButtonText: {
    fontFamily: TitleFont,
    fontSize: 16,
    color: '#FFFFFF',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCirclePracticed: {
    backgroundColor: ParentPalette.brandBlue,
  },
  weekDayCircleToday: {
    backgroundColor: ParentPalette.card,
    borderWidth: 2,
    borderColor: ParentPalette.coral,
  },
  weekDayCircleUpcoming: {
    backgroundColor: ParentPalette.iceLight,
  },
  weekDayCheck: {
    color: '#FFFFFF',
    fontFamily: BodyBold,
    fontSize: 16,
  },
  weekDayLabel: {
    fontFamily: BodyFont,
    fontSize: 11,
    color: ParentPalette.textMuted,
  },
  devResetButton: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  devResetButtonText: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
  },
});
