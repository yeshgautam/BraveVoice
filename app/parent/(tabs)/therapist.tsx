import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RECENT_HOMEWORK_ASSIGNED, THERAPIST_INFO, THERAPIST_NOTE, UPCOMING_SESSIONS } from '@/constants/parent-data';
import {
  BodyBold,
  BodyFont,
  BodyMedium,
  BodySemibold,
  ParentPalette,
  TitleFont,
} from '@/constants/parent-theme';

export default function ParentTherapistScreen() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Therapist</Text>

        <View style={styles.therapistCard}>
          <View style={styles.therapistTop}>
            <View style={styles.therapistAvatar}>
              <Text style={styles.therapistAvatarText}>{THERAPIST_INFO.initials}</Text>
            </View>
            <View style={styles.therapistInfo}>
              <Text style={styles.therapistName}>{THERAPIST_INFO.name}</Text>
              <Text style={styles.therapistRole}>{THERAPIST_INFO.role}</Text>
              <View style={styles.classCodePill}>
                <Text style={styles.classCodePillText}>Connected via class code {THERAPIST_INFO.classCode}</Text>
              </View>
            </View>
          </View>
          <View style={styles.therapistButtonRow}>
            <Pressable
              style={({ pressed }) => [styles.therapistButton, pressed && styles.pressed]}
              onPress={() => Alert.alert('Message', 'Messaging is coming soon.')}>
              <Text style={styles.therapistButtonText}>Message</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.therapistButton, pressed && styles.pressed]}
              onPress={() => Alert.alert('Call', 'Calling is coming soon.')}>
              <Text style={styles.therapistButtonText}>Call</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>UPCOMING SESSIONS</Text>
        </View>
        <View style={styles.sessionList}>
          {UPCOMING_SESSIONS.map((session) => (
            <View key={session.key} style={styles.sessionCard}>
              <Text style={styles.sessionDate}>{session.dateLabel}</Text>
              <View style={styles.sessionTypeRow}>
                <View style={styles.sessionTypeBadge}>
                  <Text style={styles.sessionTypeBadgeText}>{session.type}</Text>
                </View>
                <Text style={styles.sessionLocation}>{session.location}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.calendarButton, pressed && styles.pressed]}
                onPress={() => Alert.alert('Added!', 'Session added to your calendar.')}>
                <Text style={styles.calendarButtonText}>Add to Calendar</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>RECENT HOMEWORK ASSIGNED</Text>
        </View>
        <View style={styles.homeworkList}>
          {RECENT_HOMEWORK_ASSIGNED.map((item) => (
            <View key={item.key} style={styles.homeworkCard}>
              <View style={styles.homeworkInfo}>
                <Text style={styles.homeworkStrategy}>
                  {item.strategy} · {item.gameName}
                </Text>
                <Text style={styles.homeworkMeta}>{item.assignedLabel}</Text>
              </View>
              <Text style={styles.homeworkStatusIcon}>{item.completed ? '✅' : '⭕️'}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.messageButton, pressed && styles.pressed]}
          onPress={() => Alert.alert('Message Therapist', 'Messaging is coming soon.')}>
          <Text style={styles.messageButtonText}>Message Therapist</Text>
        </Pressable>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>NOTES FROM THERAPIST</Text>
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>&quot;{THERAPIST_NOTE.text}&quot; — {THERAPIST_NOTE.author}</Text>
          <Text style={styles.noteDate}>{THERAPIST_NOTE.dateLabel}</Text>
        </View>
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
  title: {
    fontFamily: TitleFont,
    fontSize: 32,
    color: ParentPalette.textDark,
  },
  therapistCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 18,
    marginTop: 20,
  },
  therapistTop: {
    flexDirection: 'row',
    gap: 14,
  },
  therapistAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ParentPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapistAvatarText: {
    fontFamily: TitleFont,
    fontSize: 20,
    color: ParentPalette.brandBlue,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontFamily: BodyMedium,
    fontSize: 20,
    color: ParentPalette.textDark,
  },
  therapistRole: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: ParentPalette.textMuted,
    marginTop: 2,
  },
  classCodePill: {
    alignSelf: 'flex-start',
    backgroundColor: ParentPalette.iceLight,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  classCodePillText: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.brandBlue,
  },
  therapistButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  therapistButton: {
    flex: 1,
    backgroundColor: ParentPalette.brandBlue,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  therapistButtonText: {
    fontFamily: BodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
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
  sessionList: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 16,
  },
  sessionDate: {
    fontFamily: BodyMedium,
    fontSize: 16,
    color: ParentPalette.textDark,
  },
  sessionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sessionTypeBadge: {
    backgroundColor: ParentPalette.iceLight,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  sessionTypeBadgeText: {
    fontFamily: BodySemibold,
    fontSize: 11,
    color: ParentPalette.brandBlue,
  },
  sessionLocation: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    flexShrink: 1,
  },
  calendarButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: ParentPalette.brandBlue,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  calendarButtonText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: ParentPalette.brandBlue,
  },
  homeworkList: {
    gap: 12,
  },
  homeworkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ParentPalette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 14,
    gap: 12,
  },
  homeworkInfo: {
    flex: 1,
  },
  homeworkStrategy: {
    fontFamily: BodyMedium,
    fontSize: 14,
    color: ParentPalette.textDark,
  },
  homeworkMeta: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 2,
  },
  homeworkStatusIcon: {
    fontSize: 20,
  },
  messageButton: {
    backgroundColor: ParentPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  messageButtonText: {
    fontFamily: TitleFont,
    fontSize: 18,
    color: '#FFFFFF',
  },
  noteCard: {
    backgroundColor: ParentPalette.card,
    borderWidth: 1.5,
    borderColor: ParentPalette.iceLight,
    borderRadius: 20,
    padding: 18,
  },
  noteText: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: ParentPalette.textDark,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  noteDate: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    textAlign: 'right',
    marginTop: 10,
  },
});
