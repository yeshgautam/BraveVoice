import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STUDENTS } from '@/constants/therapist-data';
import { BodyBold, BodyFont, BodyMedium, TherapistPalette, TitleFont } from '@/constants/therapist-theme';

export default function AssignTabScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Assign Homework</Text>
        <Text style={styles.subtitle}>Choose a student to assign homework to</Text>

        <View style={styles.studentList}>
          {STUDENTS.map((student) => (
            <Pressable
              key={student.id}
              style={({ pressed }) => [styles.studentCard, pressed && styles.pressed]}
              onPress={() => router.push(`/therapist/assign-homework/${student.id}` as never)}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{student.initials}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  Age {student.age} · {student.mode}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
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
  title: {
    fontFamily: TitleFont,
    fontSize: 28,
    color: TherapistPalette.textDark,
  },
  subtitle: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: TherapistPalette.textMuted,
    marginTop: 4,
    marginBottom: 20,
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
  chevron: {
    fontSize: 20,
    color: TherapistPalette.textMuted,
  },
});
