import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyBold, BodyFont, BodyMedium, BodySemibold, TherapistPalette, TitleFont } from '@/constants/therapist-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

const NOTIFICATION_SETTINGS = [
  { key: 'homework', label: 'Homework completed alerts', default: true },
  { key: 'inactivity', label: 'Student inactivity alerts', default: true },
  { key: 'weekly', label: 'Weekly report email', default: true },
  { key: 'reminders', label: 'Session reminders', default: false },
];

const APP_SETTINGS = [
  { key: 'session-length', label: 'Default session length', value: '10 minutes' },
  { key: 'reps', label: 'Default repetitions', value: '10' },
  { key: 'target', label: 'Fluency target score', value: '80%' },
  { key: 'language', label: 'Language', value: 'English' },
];

const ACCOUNT_ROWS = ['Change password', 'Privacy policy', 'Terms of service', 'Contact support'];

export default function TherapistSettingsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { resetOnboarding } = useOnboarding();
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.key, n.default]))
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>SJ</Text>
          </View>
          <Text style={styles.profileName}>Dr. Sarah Johnson</Text>
          <Text style={styles.profileRole}>Speech Language Pathologist</Text>
          <Pressable
            style={({ pressed }) => [styles.editProfileButton, pressed && styles.pressed]}
            onPress={() => Alert.alert('Edit Profile', 'Profile editing is coming soon.')}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>MY CLASS</Text>
        </View>
        <View style={styles.classCard}>
          <Text style={styles.classCode}>Class Code: ABC123</Text>
          <Text style={styles.classCodeSubtitle}>Share this code with your students</Text>
          <View style={styles.classCardButtons}>
            <Pressable
              style={({ pressed }) => [styles.classCardButton, pressed && styles.pressed]}
              onPress={() => Alert.alert('Copied!', 'Class code copied to clipboard.')}>
              <Text style={styles.classCardButtonText}>Copy Code</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.classCardButton, pressed && styles.pressed]}
              onPress={() => Alert.alert('Share', 'Sharing is coming soon.')}>
              <Text style={styles.classCardButtonText}>Share</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>NOTIFICATIONS</Text>
        </View>
        <View style={styles.listCard}>
          {NOTIFICATION_SETTINGS.map((setting, index) => (
            <View
              key={setting.key}
              style={[styles.listRow, index === NOTIFICATION_SETTINGS.length - 1 && styles.listRowLast]}>
              <Text style={styles.listRowLabel}>{setting.label}</Text>
              <Switch
                value={notifications[setting.key]}
                onValueChange={(value) => setNotifications((prev) => ({ ...prev, [setting.key]: value }))}
                trackColor={{ false: TherapistPalette.border, true: TherapistPalette.brandBlue }}
              />
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>APP SETTINGS</Text>
        </View>
        <View style={styles.listCard}>
          {APP_SETTINGS.map((setting, index) => (
            <Pressable
              key={setting.key}
              style={[styles.listRow, index === APP_SETTINGS.length - 1 && styles.listRowLast]}
              onPress={() => Alert.alert(setting.label, 'Editing this setting is coming soon.')}>
              <Text style={styles.listRowLabel}>{setting.label}</Text>
              <Text style={styles.listRowValue}>{setting.value}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>ACCOUNT</Text>
        </View>
        <View style={styles.listCard}>
          {ACCOUNT_ROWS.map((label, index) => (
            <Pressable
              key={label}
              style={[styles.listRow, index === ACCOUNT_ROWS.length - 1 && styles.listRowLast]}
              onPress={() => Alert.alert(label, 'Coming soon.')}>
              <Text style={styles.listRowLabel}>{label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding/welcome');
          }}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
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
  title: {
    fontFamily: TitleFont,
    fontSize: 32,
    color: TherapistPalette.textDark,
  },
  profileCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: TherapistPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontFamily: TitleFont,
    fontSize: 24,
    color: TherapistPalette.brandBlue,
  },
  profileName: {
    fontFamily: BodyMedium,
    fontSize: 20,
    color: TherapistPalette.textDark,
    marginTop: 12,
  },
  profileRole: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: TherapistPalette.textMuted,
    marginTop: 2,
  },
  editProfileButton: {
    backgroundColor: TherapistPalette.iceLight,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  editProfileButtonText: {
    fontFamily: BodyBold,
    fontSize: 13,
    color: TherapistPalette.brandBlue,
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
  classCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 18,
  },
  classCode: {
    fontFamily: TitleFont,
    fontSize: 24,
    color: TherapistPalette.brandBlue,
  },
  classCodeSubtitle: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    marginTop: 4,
  },
  classCardButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  classCardButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: TherapistPalette.brandBlue,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  classCardButtonText: {
    fontFamily: BodyBold,
    fontSize: 13,
    color: TherapistPalette.brandBlue,
  },
  listCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: TherapistPalette.background,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowLabel: {
    fontFamily: BodySemibold,
    fontSize: 14,
    color: TherapistPalette.textDark,
  },
  listRowValue: {
    fontFamily: BodyFont,
    fontSize: 13,
    color: TherapistPalette.textMuted,
  },
  chevron: {
    fontSize: 18,
    color: TherapistPalette.textMuted,
  },
  signOutButton: {
    backgroundColor: TherapistPalette.coral,
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  signOutButtonText: {
    fontFamily: TitleFont,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
