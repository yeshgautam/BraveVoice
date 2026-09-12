import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STUDENTS } from '@/constants/therapist-data';
import { BodyBold, BodyExtrabold, BodyFont, BodyMedium, TherapistPalette, TitleFont } from '@/constants/therapist-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

const SUMMARY_CARDS = [
  { key: 'students', value: '12 Students', label: 'Active this week', color: TherapistPalette.brandBlue },
  { key: 'sessions', value: '8 Sessions', label: 'Completed today', color: TherapistPalette.green },
  { key: 'alerts', value: '3 Alerts', label: 'Need attention', color: TherapistPalette.coral },
  { key: 'average', value: '94% Average', label: 'Fluency score', color: TherapistPalette.yellow },
];

export default function TherapistDashboardScreen() {
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
          <Text style={styles.greeting}>Good morning,{'\n'}Dr. Johnson</Text>
          <View style={styles.topBarIcons}>
            <Pressable
              style={styles.iconButton}
              onPress={() => Alert.alert('Notifications', 'No new notifications right now.')}>
              <Text style={styles.iconButtonEmoji}>🔔</Text>
            </Pressable>
            <View style={styles.finCircle}>
              <Text style={styles.finEmoji}>🐧</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryScrollContent}>
          {SUMMARY_CARDS.map((card) => (
            <View key={card.key} style={styles.summaryCard}>
              <View style={[styles.summaryIconDot, { backgroundColor: card.color }]} />
              <Text style={styles.summaryValue}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>MY STUDENTS</Text>
        </View>

        <View style={styles.studentList}>
          {STUDENTS.map((student) => (
            <Pressable
              key={student.id}
              style={({ pressed }) => [
                styles.studentCard,
                student.needsAttention && styles.studentCardAttention,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push(`/therapist/student/${student.id}` as never)}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{student.initials}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  Age {student.age} · {student.mode}
                </Text>
                <Text style={styles.studentMeta}>{student.lastActive}</Text>
                <View style={styles.fluencyTrack}>
                  <View
                    style={[
                      styles.fluencyFill,
                      {
                        width: `${student.fluencyScore}%`,
                        backgroundColor: student.needsAttention ? TherapistPalette.coral : TherapistPalette.brandBlue,
                      },
                    ]}
                  />
                </View>
              </View>
              <Pressable
                style={styles.menuButton}
                onPress={() => Alert.alert(student.name, 'Options menu coming soon.')}
                hitSlop={8}>
                <Text style={styles.menuDots}>⋮</Text>
              </Pressable>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={() => Alert.alert('Add New Student', 'Student invites are coming soon.')}>
          <Text style={styles.addButtonText}>Add New Student</Text>
        </Pressable>

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
    backgroundColor: TherapistPalette.background,
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
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: BodyFont,
    fontSize: 22,
    color: TherapistPalette.textDark,
    flex: 1,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TherapistPalette.card,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonEmoji: {
    fontSize: 18,
  },
  finCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TherapistPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finEmoji: {
    fontSize: 22,
  },
  summaryScrollContent: {
    gap: 12,
    paddingVertical: 4,
    marginTop: 20,
    paddingRight: 20,
  },
  summaryCard: {
    width: 190,
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 16,
  },
  summaryIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  summaryValue: {
    fontFamily: TitleFont,
    fontSize: 22,
    color: TherapistPalette.textDark,
    marginTop: 10,
  },
  summaryLabel: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    marginTop: 4,
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
    fontFamily: BodyExtrabold,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    letterSpacing: 0.5,
  },
  studentList: {
    gap: 12,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 14,
    gap: 12,
  },
  studentCardAttention: {
    borderColor: TherapistPalette.coral,
  },
  pressed: {
    opacity: 0.85,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TherapistPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontFamily: BodyBold,
    fontSize: 15,
    color: TherapistPalette.brandBlue,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: BodyMedium,
    fontSize: 16,
    color: TherapistPalette.textDark,
  },
  studentMeta: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    marginTop: 2,
  },
  fluencyTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: TherapistPalette.background,
    marginTop: 8,
    overflow: 'hidden',
  },
  fluencyFill: {
    height: '100%',
    borderRadius: 3,
  },
  menuButton: {
    paddingHorizontal: 4,
  },
  menuDots: {
    fontSize: 20,
    color: TherapistPalette.textMuted,
  },
  chevron: {
    fontSize: 20,
    color: TherapistPalette.textMuted,
  },
  addButton: {
    backgroundColor: TherapistPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  addButtonText: {
    fontFamily: TitleFont,
    fontSize: 18,
    color: '#FFFFFF',
  },
  devResetButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  devResetButtonText: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
  },
});
