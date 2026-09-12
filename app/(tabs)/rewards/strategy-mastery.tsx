import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TIER_STYLES } from '@/components/games/game-badge';
import { useProgress } from '@/contexts/progress-context';
import { MasteryTier, useRewardsState } from '@/contexts/rewards-context';
import { STRATEGIES, Strategy } from '@/contexts/strategy-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PALETTE = {
  background: '#EEF6FB',
  card: '#FFFFFF',
  brandBlue: '#1A6FA8',
  textDark: '#1A2A3A',
  textMuted: '#7A9AB0',
  border: '#C8DFF0',
};

const TITLE_FONT = 'FredokaOne_400Regular';
const BODY_FONT = 'Nunito_400Regular';
const BODY_SEMIBOLD = 'Nunito_600SemiBold';
const BODY_BOLD = 'Nunito_700Bold';

const STRATEGY_TO_CATEGORY = {
  easyOnset: 'easy-onset',
  lightContact: 'light-contact',
  slowSpeech: 'slow-speech',
  stretchySpeech: 'stretchy-speech',
  cancellation: 'cancellation',
} as const;

function formatPracticingSince(timestamp: number | null): string {
  if (timestamp === null) return "You haven't started this one yet";
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Started practicing today';
  if (days === 1) return 'Practicing since yesterday';
  return `Practicing for ${days} days`;
}

function tierLabel(tier: MasteryTier): string {
  return TIER_STYLES[tier].label;
}

function MasteryCard({ strategy }: { strategy: (typeof STRATEGIES)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const { masteryByStrategy } = useRewardsState();
  const { firstPracticedAt } = useProgress();
  const mastery = masteryByStrategy[strategy.key as Strategy];
  const colors = TIER_STYLES[mastery.tier];
  const started = mastery.attempts > 0;
  const categoryKey = STRATEGY_TO_CATEGORY[strategy.key as Strategy];

  const progressRatio =
    mastery.nextTierThreshold === null
      ? 1
      : (mastery.attempts - mastery.currentTierFloor) / (mastery.nextTierThreshold - mastery.currentTierFloor);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  return (
    <Pressable style={styles.card} onPress={toggle}>
      <View style={styles.cardTop}>
        <View
          style={[
            styles.badge,
            { borderColor: colors.border, backgroundColor: colors.background, opacity: started ? 1 : 0.5 },
          ]}>
          <Text style={styles.badgeIcon}>{strategy.icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{strategy.label}</Text>
            <View style={[styles.tierPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.tierPillText, { color: colors.accent }]}>{tierLabel(mastery.tier)}</Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{strategy.description}</Text>

          {mastery.nextTier ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(1, Math.max(0, progressRatio)) * 100}%`, backgroundColor: colors.accent }]} />
              </View>
              <Text style={styles.progressLabel}>
                {mastery.attempts - mastery.currentTierFloor}/{mastery.nextTierThreshold! - mastery.currentTierFloor} to {tierLabel(mastery.nextTier)}
              </Text>
            </>
          ) : (
            <Text style={styles.maxedLabel}>Gold mastery reached! 🏆</Text>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.summaryPanel}>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryBold}>{mastery.attempts}</Text> successful attempts total
          </Text>
          <Text style={styles.summaryLine}>{formatPracticingSince(firstPracticedAt[categoryKey])}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function StrategyMasteryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Strategy Mastery</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {STRATEGIES.map((strategy) => (
          <MasteryCard key={strategy.key} strategy={strategy} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: PALETTE.brandBlue,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    fontFamily: BODY_BOLD,
    fontSize: 14,
    color: PALETTE.brandBlue,
  },
  pressed: {
    opacity: 0.85,
  },
  backButtonSpacer: {
    width: 68,
  },
  screenTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 20,
    color: PALETTE.textDark,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 14,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 17,
    color: PALETTE.textDark,
  },
  tierPill: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tierPillText: {
    fontFamily: BODY_BOLD,
    fontSize: 11,
  },
  cardDescription: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.background,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: BODY_SEMIBOLD,
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 6,
  },
  maxedLabel: {
    fontFamily: BODY_BOLD,
    fontSize: 12,
    color: '#C98A0E',
    marginTop: 10,
  },
  summaryPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
    gap: 4,
  },
  summaryLine: {
    fontFamily: BODY_FONT,
    fontSize: 13,
    color: PALETTE.textDark,
  },
  summaryBold: {
    fontFamily: BODY_BOLD,
  },
});
