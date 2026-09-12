import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { GAME_CATALOG } from '@/constants/games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { CategoryKey, useProgress, xpToStars } from '@/contexts/progress-context';

type Level = { name: string; xpRequired: number };

const LEVELS: Level[] = [
  { name: 'Ice Cub', xpRequired: 0 },
  { name: 'Snow Walker', xpRequired: 100 },
  { name: 'Glacier Guide', xpRequired: 250 },
  { name: 'Aurora Voice', xpRequired: 450 },
  { name: 'Arctic Champion', xpRequired: 700 },
];

function getLevelProgress(totalXP: number) {
  let currentIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXP >= LEVELS[i].xpRequired) currentIndex = i;
  }
  const level = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] ?? null;
  const ratio = next
    ? Math.min(1, (totalXP - level.xpRequired) / (next.xpRequired - level.xpRequired))
    : 1;
  return { level, levelNumber: currentIndex + 1, next, ratio };
}

const CATEGORY_ORDER: CategoryKey[] = [
  'easy-onset',
  'slow-speech',
  'stretchy-speech',
  'light-contact',
  'cancellation',
];

const SETTINGS_ROWS = [
  { key: 'change-name', label: 'Change name' },
  { key: 'change-age', label: 'Change age' },
  { key: 'privacy', label: 'Privacy policy' },
  { key: 'stutter-ok', label: "It's OK to Stutter" },
] as const;

export function ProfileYoungScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { username, mode, classCode, therapistName, connectToTherapist, resetOnboarding } = useOnboarding();
  const { totalXP, streakDays, gameStats } = useProgress();

  const [soundEffects, setSoundEffects] = useState(true);
  const [music, setMusic] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const totalStars = xpToStars(totalXP);
  const badgeCount = CATEGORY_ORDER.reduce((sum, key) => {
    return (
      sum +
      GAME_CATALOG[key].reduce((catSum, game) => catSum + Math.min(3, gameStats[game.key]?.bestStars ?? 0), 0)
    );
  }, 0);

  const displayName = username.trim() || 'Friend';
  const initials = displayName.slice(0, 2).toUpperCase();
  const modeLabel = mode === 'older' ? 'Big Voices' : 'Little Voices';

  const { level, levelNumber, next, ratio } = getLevelProgress(totalXP);
  const xpToNext = next ? next.xpRequired - totalXP : 0;

  const therapistInitials = (therapistName ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleEnterClassCode = () => {
    Alert.prompt(
      'Enter Class Code',
      'Ask your therapist for your class code!',
      (code) => {
        if (code && code.trim()) connectToTherapist(code.trim().toUpperCase());
      },
      'plain-text'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BraveVoiceHeader />
      <Text style={styles.title}>My Profile 👤</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Pressable
            style={styles.editButton}
            onPress={() => Alert.alert('Edit Profile', 'Profile editing is coming soon!')}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.childName}>{displayName}</Text>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>{modeLabel}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>⭐ {totalStars}</Text>
            <Text style={styles.statLabel}>Stars</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {streakDays}</Text>
            <Text style={styles.statLabel}>{streakDays === 1 ? 'Day Streak' : 'Day Streak'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🏅 {badgeCount}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>MY LEVEL</Text>
        </View>
        <View style={styles.levelCard}>
          <Text style={styles.levelName}>{level.name}</Text>
          <Text style={styles.levelNumber}>Level {levelNumber}</Text>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${ratio * 100}%` }]} />
          </View>
          <Text style={styles.levelHint}>
            {next ? `${xpToNext} XP to reach ${next.name}` : 'Max level reached! 🎉'}
          </Text>
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>CONNECTED THERAPIST</Text>
        </View>
        <View style={styles.therapistCard}>
          <View style={styles.therapistAvatar}>
            <Text style={styles.therapistAvatarText}>{therapistInitials || '?'}</Text>
          </View>
          {classCode ? (
            <>
              <Text style={styles.therapistName}>{therapistName}</Text>
              <View style={styles.connectedPill}>
                <Text style={styles.connectedPillText}>Connected via {classCode}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.notConnectedText}>Not connected yet</Text>
              <Pressable
                style={({ pressed }) => [styles.classCodeButton, pressed && styles.pressed]}
                onPress={handleEnterClassCode}>
                <Text style={styles.classCodeButtonText}>Enter class code</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>SETTINGS</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowLabel}>Sound effects</Text>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: '#C8DFF0', true: OnboardingPalette.progressActive }}
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowLabel}>Music</Text>
            <Switch
              value={music}
              onValueChange={setMusic}
              trackColor={{ false: '#C8DFF0', true: OnboardingPalette.progressActive }}
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowLabel}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#C8DFF0', true: OnboardingPalette.progressActive }}
            />
          </View>
          {SETTINGS_ROWS.map((row) => (
            <Pressable
              key={row.key}
              style={styles.settingsRow}
              onPress={() =>
                row.key === 'stutter-ok' ? router.push('/stutter-ok') : Alert.alert(row.label, 'Coming soon!')
              }>
              <Text style={styles.settingsRowLabel}>{row.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.settingsRow, styles.settingsRowLast]}
            onPress={() => {
              resetOnboarding();
              router.replace('/onboarding/welcome');
            }}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  editButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '800',
    color: OnboardingPalette.progressActive,
  },
  childName: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 12,
  },
  modeBadge: {
    backgroundColor: OnboardingPalette.speechBubble,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  modeBadgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  statLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
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
  levelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  levelName: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    color: OnboardingPalette.progressActive,
  },
  levelNumber: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    marginTop: 2,
  },
  levelTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 14,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: OnboardingPalette.progressActive,
  },
  levelHint: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
    marginTop: 10,
  },
  therapistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
  },
  therapistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapistAvatarText: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: OnboardingPalette.progressActive,
  },
  therapistName: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.title,
    marginTop: 10,
  },
  connectedPill: {
    backgroundColor: OnboardingPalette.speechBubble,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  connectedPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.progressActive,
    fontWeight: '600',
  },
  notConnectedText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    color: OnboardingPalette.subtitle,
    marginTop: 10,
  },
  classCodeButton: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  classCodeButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: OnboardingPalette.background,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: OnboardingPalette.title,
  },
  chevron: {
    fontSize: 20,
    color: OnboardingPalette.subtitle,
  },
  signOutText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: '#E8724A',
  },
});
