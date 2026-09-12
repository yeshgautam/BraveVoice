import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { getLevelProgress } from '@/constants/older-levels';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useProgress } from '@/contexts/progress-context';

const TIERS_PER_GAME = 3;

const SETTINGS_ROWS = [
  { key: 'change-name', emoji: '✏️', label: 'Change name' },
  { key: 'change-age', emoji: '🎂', label: 'Change age' },
  { key: 'privacy', emoji: '🔒', label: 'Privacy policy' },
  { key: 'stutter-ok', emoji: '👍', label: "It's OK to Stutter" },
] as const;

export function ProfileOlderScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { username, classCode, therapistName, connectToTherapist, resetOnboarding } = useOnboarding();
  const { totalXP, streakDays, gameStats } = useProgress();

  const [soundEffects, setSoundEffects] = useState(true);
  const [music, setMusic] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const displayName = username.trim() || 'Player';
  const initials = displayName.slice(0, 2).toUpperCase();

  const badgeCount = NEW_GAMES_CATALOG.reduce(
    (sum, g) => sum + Math.min(TIERS_PER_GAME, gameStats[g.key]?.bestStars ?? 0),
    0
  );

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
          <Text style={styles.playerName}>{displayName}</Text>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>Big Voices</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>⭐ {totalXP}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
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
          <Text style={styles.levelName}>{level.name} ⚔️</Text>
          <Text style={styles.levelNumber}>Level {levelNumber}</Text>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${ratio * 100}%` }]} />
          </View>
          <Text style={styles.levelHint}>
            {next
              ? `${totalXP} / ${next.xpRequired} XP — ${xpToNext} XP to reach ${next.name}`
              : 'Max level reached! 🎉'}
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
              <Text style={styles.notConnectedText}>No therapist connected yet</Text>
              <Pressable
                style={({ pressed }) => [styles.classCodeButton, pressed && styles.pressed]}
                onPress={handleEnterClassCode}>
                <Text style={styles.classCodeButtonText}>Enter Class Code</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.sectionPill}>
          <Text style={styles.sectionPillText}>SETTINGS</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowLabel}>🔊 Sound effects</Text>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: '#C8DFF0', true: OnboardingPalette.progressActive }}
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowLabel}>🎵 Music</Text>
            <Switch
              value={music}
              onValueChange={setMusic}
              trackColor={{ false: '#C8DFF0', true: OnboardingPalette.progressActive }}
            />
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsRowLabel}>🔔 Notifications</Text>
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
              <Text style={styles.settingsRowLabel}>
                {row.emoji} {row.label}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.settingsRow, styles.settingsRowLast]}
            onPress={() => {
              resetOnboarding();
              router.replace('/onboarding/welcome');
            }}>
            <Text style={styles.signOutText}>🚪 Sign out</Text>
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
  playerName: {
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
    fontSize: 18,
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
    fontSize: 22,
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
    fontSize: 15,
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
