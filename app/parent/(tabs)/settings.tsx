import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHILD, PARENT_EMAIL, PARENT_NAME, THERAPIST_INFO } from '@/constants/parent-data';
import { BodyBold, BodyFont, BodyMedium, BodySemibold, ParentPalette, TitleFont } from '@/constants/parent-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

const REMINDER_SETTINGS = [
  { key: 'daily', label: 'Daily practice reminder', default: true, valueLabel: '6:00 PM' },
  { key: 'homework-due', label: 'Homework due reminders', default: true, valueLabel: null },
  { key: 'weekly-report', label: 'Weekly progress report', default: true, valueLabel: null },
  { key: 'therapist-messages', label: 'Therapist messages', default: true, valueLabel: null },
];

const PARENT_CONTROL_TOGGLES = [
  { key: 'parent-pin', label: 'Require parent PIN to access settings', default: false },
  { key: 'allow-leaderboard', label: 'Allow leaderboard', default: true },
];

const ACCOUNT_ROWS = ['Change password', 'Privacy policy', 'Terms of service', 'Contact support'];

export default function ParentSettingsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { resetOnboarding } = useOnboarding();

  const [reminders, setReminders] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REMINDER_SETTINGS.map((r) => [r.key, r.default]))
  );
  const [soundEffects, setSoundEffects] = useState(true);
  const [music, setMusic] = useState(true);
  const [parentControls, setParentControls] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PARENT_CONTROL_TOGGLES.map((c) => [c.key, c.default]))
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.childCard}>
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>{CHILD.initials}</Text>
          </View>
          <Text style={styles.childName}>{CHILD.name}</Text>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {CHILD.mode} · Age {CHILD.age}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editProfileButton, pressed && styles.pressed]}
            onPress={() => Alert.alert('Edit Profile', 'Profile editing is coming soon.')}>
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>PRACTICE REMINDERS</Text>
        </View>
        <View style={styles.listCard}>
          {REMINDER_SETTINGS.map((setting, index) => (
            <View
              key={setting.key}
              style={[styles.listRow, index === REMINDER_SETTINGS.length - 1 && styles.listRowLast]}>
              <Text style={styles.listRowLabel}>{setting.label}</Text>
              <View style={styles.listRowRight}>
                {setting.valueLabel && reminders[setting.key] && (
                  <Text style={styles.listRowValue}>{setting.valueLabel}</Text>
                )}
                <Switch
                  value={reminders[setting.key]}
                  onValueChange={(value) => setReminders((prev) => ({ ...prev, [setting.key]: value }))}
                  trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>CHILD SETTINGS</Text>
        </View>
        <View style={styles.listCard}>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Child&apos;s name</Text>
            <Text style={styles.listRowValue}>{CHILD.name}</Text>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Age</Text>
            <Text style={styles.listRowValue}>{CHILD.age}</Text>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Mode — {CHILD.mode}</Text>
            <Pressable onPress={() => Alert.alert('Change Mode', 'Mode switching is coming soon.')}>
              <Text style={styles.changeButtonText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Class code — {THERAPIST_INFO.classCode}</Text>
            <Pressable onPress={() => Alert.alert('Change Class Code', 'Class code changes are coming soon.')}>
              <Text style={styles.changeButtonText}>Change</Text>
            </Pressable>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Sound effects</Text>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }}
            />
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Music</Text>
            <Switch
              value={music}
              onValueChange={setMusic}
              trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }}
            />
          </View>
          <View style={[styles.listRow, styles.listRowLast]}>
            <Text style={styles.listRowLabel}>Voice recording (required)</Text>
            <Switch value={true} disabled trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }} />
          </View>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>PARENT CONTROLS</Text>
        </View>
        <View style={styles.listCard}>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Require parent PIN to access settings</Text>
            <Switch
              value={parentControls['parent-pin']}
              onValueChange={(value) => setParentControls((prev) => ({ ...prev, 'parent-pin': value }))}
              trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }}
            />
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Screen time limit per session</Text>
            <Text style={styles.listRowValue}>15 minutes</Text>
          </View>
          <View style={styles.listRow}>
            <Text style={styles.listRowLabel}>Allow leaderboard</Text>
            <Switch
              value={parentControls['allow-leaderboard']}
              onValueChange={(value) => setParentControls((prev) => ({ ...prev, 'allow-leaderboard': value }))}
              trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }}
            />
          </View>
          <View style={[styles.listRow, styles.listRowLast]}>
            <Text style={styles.listRowLabel}>Share progress with therapist (required)</Text>
            <Switch value={true} disabled trackColor={{ false: ParentPalette.border, true: ParentPalette.brandBlue }} />
          </View>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>SUPPORT</Text>
        </View>
        <View style={styles.listCard}>
          <Pressable style={styles.listRow} onPress={() => router.push('/parent/understanding-stuttering')}>
            <View>
              <Text style={styles.listRowLabel}>Understanding Stuttering</Text>
              <Text style={styles.listRowSubtext}>Disfluency types, what helps, what to avoid</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={[styles.listRow, styles.listRowLast]} onPress={() => router.push('/parent/diagnostic-assessment')}>
            <View>
              <Text style={styles.listRowLabel}>Sound Diagnostic Assessment</Text>
              <Text style={styles.listRowSubtext}>A quick baseline check of which sounds are toughest</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>GAME TESTING</Text>
        </View>
        <View style={styles.listCard}>
          <Pressable style={[styles.listRow, styles.listRowLast]} onPress={() => router.push('/parent/self-grade')}>
            <View>
              <Text style={styles.listRowLabel}>Self-Grade Games</Text>
              <Text style={styles.listRowSubtext}>Play and grade every game (1–3 stars) for both age modes</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>ACCOUNT</Text>
        </View>
        <View style={styles.listCard}>
          <View style={styles.listRow}>
            <View>
              <Text style={styles.listRowLabel}>{PARENT_NAME}</Text>
              <Text style={styles.listRowSubtext}>{PARENT_EMAIL}</Text>
            </View>
          </View>
          {ACCOUNT_ROWS.map((label, index) => (
            <Pressable
              key={label}
              style={[styles.listRow, index === ACCOUNT_ROWS.length - 1 && styles.listRowLast]}
              onPress={() => Alert.alert(label, 'Coming soon.')}>
              <View>
                <Text style={styles.listRowLabel}>{label}</Text>
                {label === 'Terms of service' && (
                  <Text style={styles.listRowSubtext}>Includes COPPA compliance for children&apos;s data</Text>
                )}
              </View>
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
  childCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  childAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ParentPalette.iceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontFamily: TitleFont,
    fontSize: 24,
    color: ParentPalette.brandBlue,
  },
  childName: {
    fontFamily: BodyMedium,
    fontSize: 20,
    color: ParentPalette.textDark,
    marginTop: 12,
  },
  modeBadge: {
    backgroundColor: ParentPalette.iceLight,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  modeBadgeText: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.brandBlue,
  },
  editProfileButton: {
    backgroundColor: ParentPalette.iceLight,
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
    color: ParentPalette.brandBlue,
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
  listCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: ParentPalette.background,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listRowLabel: {
    fontFamily: BodySemibold,
    fontSize: 14,
    color: ParentPalette.textDark,
    flexShrink: 1,
  },
  listRowSubtext: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    marginTop: 2,
  },
  listRowValue: {
    fontFamily: BodyFont,
    fontSize: 13,
    color: ParentPalette.textMuted,
  },
  changeButtonText: {
    fontFamily: BodyBold,
    fontSize: 13,
    color: ParentPalette.brandBlue,
  },
  chevron: {
    fontSize: 18,
    color: ParentPalette.textMuted,
  },
  signOutButton: {
    backgroundColor: ParentPalette.coral,
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
