import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHomework, getStudent, PHONEME_BREAKDOWN, PRIORITY_PHONEMES } from '@/constants/therapist-data';
import { BodyBold, BodyFont, BodySemibold, TherapistPalette, TitleFont } from '@/constants/therapist-theme';

type DetailTab = 'Overview' | 'Progress' | 'History';
const TABS: DetailTab[] = ['Overview', 'Progress', 'History'];

function phonemeColor(score: number) {
  if (score >= 80) return TherapistPalette.green;
  if (score >= 65) return TherapistPalette.yellow;
  return TherapistPalette.coral;
}

export default function StudentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const student = getStudent(id ?? '');
  const homework = getHomework(id ?? '');
  const [tab, setTab] = useState<DetailTab>('Overview');

  if (!student) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.notFound}>Student not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
          <View style={styles.backButtonSpacer} />
        </View>

        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentMeta}>
          Age {student.age} · {student.mode}
        </Text>

        <View style={styles.tabPills}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              style={[styles.tabPill, tab === t && styles.tabPillActive]}
              onPress={() => setTab(t)}>
              <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {tab !== 'Overview' && (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>{tab} view is coming soon.</Text>
          </View>
        )}

        {tab === 'Overview' && (
          <>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>{student.fluencyScore}%</Text>
              <Text style={styles.scoreLabel}>Average fluency score</Text>
              <Text style={styles.scoreDelta}>↑ 12% from last week</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>7 Day Streak 🔥</Text>
                <Text style={styles.statLabel}>Practicing daily</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>320 XP</Text>
                <Text style={styles.statLabel}>Earned this week</Text>
              </View>
            </View>

            <View style={styles.pillLabel}>
              <Text style={styles.pillLabelText}>THIS WEEK&apos;S HOMEWORK</Text>
            </View>

            <View style={styles.homeworkList}>
              {homework.map((item) => (
                <View key={item.key} style={styles.homeworkCard}>
                  <Text style={styles.homeworkStatusIcon}>{item.completed ? '✅' : '○'}</Text>
                  <View style={styles.homeworkInfo}>
                    <Text style={styles.homeworkStrategy}>
                      {item.strategy} · {item.gameName}
                    </Text>
                    <Text style={styles.homeworkStatus}>
                      {item.completed
                        ? `Completed · ${item.fluencyScore}% fluency · ${item.dateLabel}`
                        : item.dateLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.pillLabel}>
              <Text style={styles.pillLabelText}>PHONEME BREAKDOWN</Text>
            </View>

            <View style={styles.phonemeCard}>
              {PHONEME_BREAKDOWN.map((p) => (
                <View key={p.phoneme} style={styles.phonemeRow}>
                  <Text style={styles.phonemeLabel}>{p.phoneme}</Text>
                  <View style={styles.phonemeTrack}>
                    <View
                      style={[
                        styles.phonemeFill,
                        { width: `${p.score}%`, backgroundColor: phonemeColor(p.score) },
                      ]}
                    />
                  </View>
                  <Text style={styles.phonemeScore}>{p.score}%</Text>
                </View>
              ))}
              <Text style={styles.phonemeNote}>
                AI identified {PRIORITY_PHONEMES.join(' and ')} as priority sounds
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.assignButton, pressed && styles.pressed]}
              onPress={() => router.push(`/therapist/assign-homework/${student.id}` as never)}>
              <Text style={styles.assignButtonText}>Assign Homework</Text>
            </Pressable>
          </>
        )}
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  notFound: {
    fontFamily: BodyFont,
    fontSize: 16,
    color: TherapistPalette.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: TherapistPalette.iceLight,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backButtonSpacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  backButtonText: {
    fontFamily: BodyBold,
    fontSize: 14,
    color: TherapistPalette.brandBlue,
  },
  studentName: {
    fontFamily: TitleFont,
    fontSize: 28,
    color: TherapistPalette.textDark,
    textAlign: 'center',
    marginTop: 18,
  },
  studentMeta: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: TherapistPalette.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  tabPills: {
    flexDirection: 'row',
    backgroundColor: TherapistPalette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 4,
    marginTop: 20,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: TherapistPalette.brandBlue,
  },
  tabPillText: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: TherapistPalette.textMuted,
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  comingSoon: {
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
  },
  comingSoonText: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: TherapistPalette.textMuted,
  },
  scoreCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    paddingVertical: 28,
    alignItems: 'center',
    marginTop: 20,
  },
  scoreValue: {
    fontFamily: TitleFont,
    fontSize: 48,
    color: TherapistPalette.brandBlue,
  },
  scoreLabel: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: TherapistPalette.textMuted,
    marginTop: 4,
  },
  scoreDelta: {
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.green,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    paddingVertical: 18,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: TitleFont,
    fontSize: 24,
    color: TherapistPalette.textDark,
  },
  statLabel: {
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
    fontFamily: BodyBold,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    letterSpacing: 0.5,
  },
  homeworkList: {
    gap: 10,
  },
  homeworkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TherapistPalette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 14,
    gap: 12,
  },
  homeworkStatusIcon: {
    fontSize: 20,
  },
  homeworkInfo: {
    flex: 1,
  },
  homeworkStrategy: {
    fontFamily: BodySemibold,
    fontSize: 14,
    color: TherapistPalette.textDark,
  },
  homeworkStatus: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    marginTop: 2,
  },
  phonemeCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 18,
    gap: 12,
  },
  phonemeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phonemeLabel: {
    width: 32,
    fontFamily: BodyBold,
    fontSize: 14,
    color: TherapistPalette.textDark,
  },
  phonemeTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: TherapistPalette.background,
    overflow: 'hidden',
  },
  phonemeFill: {
    height: '100%',
    borderRadius: 4,
  },
  phonemeScore: {
    width: 40,
    textAlign: 'right',
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.textDark,
  },
  phonemeNote: {
    fontFamily: BodyFont,
    fontSize: 12,
    fontStyle: 'italic',
    color: TherapistPalette.textMuted,
    marginTop: 4,
  },
  assignButton: {
    backgroundColor: TherapistPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  assignButtonText: {
    fontFamily: TitleFont,
    fontSize: 18,
    color: '#FFFFFF',
  },
});
