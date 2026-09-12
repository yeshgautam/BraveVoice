import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { findGameCatalogEntry } from '@/constants/games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useHomework } from '@/contexts/homework-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { CategoryKey, useProgress } from '@/contexts/progress-context';
import { HomeworkChallenge } from '@/lib/session-sync/types';

const DAILY_XP_GOAL = 100;

type ChallengeCard = {
  key: string;
  title: string;
  description: string;
  route: string | null;
  icon: number;
  progress: number;
};

// Shown when the therapist hasn't assigned homework (or none is cached and the server
// is unreachable) — generic practice, not tied to a specific assignment.
const DEFAULT_CHALLENGES: {
  key: string;
  title: string;
  description: string;
  categoryKey: CategoryKey | null;
  icon: number;
  route: '/(tabs)/games/easy-onset' | '/(tabs)/games/slow-speech' | '/(tabs)/games/stretchy-speech' | null;
}[] = [
  {
    key: 'easy-onset',
    title: 'Easy Onset',
    description: 'Start words with a gentle breath',
    categoryKey: 'easy-onset',
    icon: require('@/assets/images/badge-challenge-icon.png'),
    route: '/(tabs)/games/easy-onset',
  },
  {
    key: 'slow-speech',
    title: 'Slow Speech',
    description: 'Take it nice and slow',
    categoryKey: 'slow-speech',
    icon: require('@/assets/images/badge-challenge-icon.png'),
    route: '/(tabs)/games/slow-speech',
  },
  {
    key: 'stretchy-speech',
    title: 'Stretchy Speech',
    description: 'Stretch your words long and smooth',
    categoryKey: 'stretchy-speech',
    icon: require('@/assets/images/badge-rainbow-stretch.png'),
    route: '/(tabs)/games/stretchy-speech',
  },
];

const FALLBACK_ICON = require('@/assets/images/badge-challenge-icon.png');

function toChallengeCard(item: HomeworkChallenge): ChallengeCard {
  const gameEntry = findGameCatalogEntry(item.game);
  return {
    key: `homework-${item.game}-${item.strategy}`,
    title: item.game,
    description: item.focus ?? `Practice ${item.strategy}`,
    route: gameEntry ? `/(tabs)/games/${gameEntry.key}` : null,
    icon: gameEntry?.badge ?? FALLBACK_ICON,
    progress: item.progress,
  };
}

export function HomeYoungScreen() {
  const router = useRouter();
  const { role, username, resetOnboarding } = useOnboarding();
  const { streakDays, todayXP, categoryProgress } = useProgress();
  const { challenges: homework, source: homeworkSource } = useHomework();
  const greetingName = username.trim() || 'friend';
  const tabBarHeight = useBottomTabBarHeight();
  const scrollRef = useRef<ScrollView>(null);
  const needsOnboarding = !role || !username.trim();

  const todayXPRatio = Math.min(1, todayXP / DAILY_XP_GOAL);

  // Real assigned homework replaces the static suggestions once it's available; when
  // none is assigned (or none is cached and the server is unreachable), fall back to
  // generic practice.
  const challengeCards: ChallengeCard[] =
    homework.length > 0
      ? homework.map(toChallengeCard)
      : DEFAULT_CHALLENGES.map((challenge) => ({
          key: challenge.key,
          title: challenge.title,
          description: challenge.description,
          route: challenge.route,
          icon: challenge.icon,
          progress: challenge.categoryKey ? categoryProgress[challenge.categoryKey] : 0,
        }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}>
        <BraveVoiceHeader />

        {needsOnboarding && (
          <Pressable
            style={styles.onboardingBanner}
            onPress={() => router.push('/onboarding/welcome')}>
            <Text style={styles.onboardingBannerText}>👋 Finish setting up your profile</Text>
            <Text style={styles.onboardingBannerArrow}>→</Text>
          </Pressable>
        )}

        <View style={styles.header}>
          <Image
            source={require('@/assets/images/fin-home-header.png')}
            style={styles.finImage}
            contentFit="contain"
          />
          <SpeechBubble text={`Hi ${greetingName}!`} style={styles.greetingBubble} />
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>STREAK</Text>
          </View>
          <Text style={styles.streakNumber}>{streakDays} 🔥</Text>
          <Text style={styles.streakLabel}>{streakDays === 1 ? 'Day in a Row!' : 'Days in a Row!'}</Text>
        </View>

        <View style={styles.xpCard}>
          <View style={styles.xpPill}>
            <Text style={styles.xpPillText}>Today&apos;s XP</Text>
          </View>
          <Text style={styles.xpLabel}>
            ⭐ {todayXP} / {DAILY_XP_GOAL} XP
          </Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${todayXPRatio * 100}%` }]} />
          </View>
        </View>

        <View style={styles.challengesPill}>
          <Text style={styles.challengesPillText}>
            {homework.length > 0 ? "TODAY'S HOMEWORK" : "TODAY'S CHALLENGES"}
          </Text>
        </View>

        {homework.length > 0 && homeworkSource === 'cache' && (
          <Text style={styles.offlineNotice}>📴 Offline — showing your last saved homework</Text>
        )}

        <View style={styles.challengeList}>
          {challengeCards.map((challenge) => (
            <Pressable
              key={challenge.key}
              style={[styles.challengeCard, !challenge.route && styles.challengeCardDisabled]}
              onPress={() =>
                challenge.route
                  ? router.push(challenge.route as never)
                  : Alert.alert('Coming soon!', `${challenge.title} is still being built — check back soon!`)
              }>
              {challenge.icon ? (
                <Image source={challenge.icon} style={styles.challengeIcon} contentFit="contain" />
              ) : (
                <View style={styles.challengeIconPlaceholder} />
              )}
              <View style={styles.challengeText}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
                <View style={styles.challengeTrack}>
                  <View style={[styles.challengeFill, { width: `${challenge.progress * 100}%` }]} />
                </View>
              </View>
              <Text style={styles.challengeChevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.devResetButton, pressed && styles.devResetButtonPressed]}
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
    backgroundColor: OnboardingPalette.background,
  },
  scroll: {
    flex: 1,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF6DE',
    borderWidth: 1.5,
    borderColor: '#F5B942',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  onboardingBannerText: {
    fontFamily: Fonts.rounded,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#7A5A15',
  },
  onboardingBannerArrow: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: '#7A5A15',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  finImage: {
    width: 140,
    height: 194,
  },
  greetingBubble: {
    flex: 1,
    marginLeft: 8,
    marginTop: 24,
  },
  streakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  streakPill: {
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  streakPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  streakNumber: {
    fontFamily: Fonts.rounded,
    fontSize: 44,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 8,
  },
  streakLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    marginTop: 2,
  },
  xpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 14,
  },
  xpPill: {
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  xpPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  xpLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 12,
  },
  xpTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 10,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#F5B942',
  },
  challengesPill: {
    alignSelf: 'center',
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  challengesPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.title,
    letterSpacing: 0.5,
  },
  offlineNotice: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 8,
  },
  challengeList: {
    gap: 14,
    marginTop: 16,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  challengeCardDisabled: {
    opacity: 0.7,
  },
  challengeIcon: {
    width: 56,
    height: 56,
  },
  challengeIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: OnboardingPalette.speechBubble,
  },
  challengeText: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  challengeDescription: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 2,
  },
  challengeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: OnboardingPalette.speechBubble,
    marginTop: 8,
    overflow: 'hidden',
  },
  challengeFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: OnboardingPalette.progressActive,
  },
  challengeChevron: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '700',
    color: '#7A9AB0',
  },
  devResetButton: {
    alignSelf: 'center',
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  devResetButtonPressed: {
    opacity: 0.6,
  },
  devResetButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
  },
});
