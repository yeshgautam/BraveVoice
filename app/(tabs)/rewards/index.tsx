import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TIER_STYLES } from '@/components/games/game-badge';
import { HQ_SLOTS, findHqItem } from '@/content/hqItems';
import { useRewardsState } from '@/contexts/rewards-context';
import { STRATEGIES } from '@/contexts/strategy-context';
import { FinCharacter } from '@/game-engine/FinCharacter';

const PALETTE = {
  background: '#EEF6FB',
  card: '#FFFFFF',
  brandBlue: '#1A6FA8',
  coral: '#E8724A',
  yellow: '#F5C842',
  textDark: '#1A2A3A',
  textMuted: '#7A9AB0',
  border: '#C8DFF0',
};

const TITLE_FONT = 'FredokaOne_400Regular';
const BODY_FONT = 'Nunito_400Regular';
const BODY_SEMIBOLD = 'Nunito_600SemiBold';
const BODY_BOLD = 'Nunito_700Bold';
const BODY_EXTRABOLD = 'Nunito_800ExtraBold';

function RewardsHubOlder() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { availableStars, equippedFinItemKeys, unlockedFinItemKeys, masteryByStrategy, hqPlacements } = useRewardsState();

  // "Newly unlocked" = owned but not currently equipped — a simple, honest proxy for "you have
  // something you haven't tried on yet" without a separate seen/unseen tracking system.
  const newlyUnlockedCount = unlockedFinItemKeys.filter(
    (key) => equippedFinItemKeys.hat !== key && equippedFinItemKeys.accessory !== key && equippedFinItemKeys.background !== key
  ).length;

  const placedCount = HQ_SLOTS.filter((slot) => hqPlacements[slot.key]).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Rewards</Text>
          <View style={styles.starsPill}>
            <Text style={styles.starsPillText}>⭐ {availableStars}</Text>
          </View>
        </View>

        {/* Section 1: Customize Fin */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.customizeCard, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/rewards/customize-fin')}>
          <View style={styles.customizeFinPreview}>
            <FinCharacter state="idle" size={72} />
          </View>
          <View style={styles.customizeInfo}>
            <Text style={styles.cardTitle}>Customize Fin</Text>
            <Text style={styles.cardSubtitle}>Give Fin a new look with hats, accessories &amp; more</Text>
            {newlyUnlockedCount > 0 && (
              <View style={styles.newPill}>
                <Text style={styles.newPillText}>{newlyUnlockedCount} new to try on!</Text>
              </View>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Section 2: Strategy mastery */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/rewards/strategy-mastery')}>
          <View style={styles.masteryHeader}>
            <Text style={styles.cardTitle}>Strategy Mastery</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.masteryRow}>
            {STRATEGIES.map((strategy) => {
              const mastery = masteryByStrategy[strategy.key];
              const colors = TIER_STYLES[mastery.tier];
              const started = mastery.attempts > 0;
              return (
                <View key={strategy.key} style={styles.masteryBadgeWrap}>
                  <View
                    style={[
                      styles.masteryBadge,
                      { borderColor: colors.border, backgroundColor: colors.background, opacity: started ? 1 : 0.5 },
                    ]}>
                    <Text style={styles.masteryBadgeIcon}>{strategy.icon}</Text>
                  </View>
                  <Text style={[styles.masteryTierLabel, { color: colors.accent }]}>{colors.label}</Text>
                </View>
              );
            })}
          </View>
        </Pressable>

        {/* Section 3: Fin's Arctic HQ */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.hqCard, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/rewards/arctic-hq')}>
          <View style={styles.hqThumbnail}>
            {HQ_SLOTS.slice(0, 4).map((slot) => {
              const itemKey = hqPlacements[slot.key];
              const item = itemKey ? findHqItem(itemKey) : undefined;
              return (
                <View key={slot.key} style={styles.hqThumbSlot}>
                  <Text style={styles.hqThumbSlotIcon}>{item?.icon ?? ''}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.customizeInfo}>
            <Text style={styles.cardTitle}>Fin&apos;s Arctic HQ</Text>
            <Text style={styles.cardSubtitle}>
              {placedCount} / {HQ_SLOTS.length} spots decorated
            </Text>
          </View>
          <View style={styles.visitButton}>
            <Text style={styles.visitButtonText}>Visit</Text>
          </View>
        </Pressable>

        {/* Section 4: Share your progress */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.shareCard, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/rewards/share')}>
          <Text style={styles.shareEmoji}>📤</Text>
          <View style={styles.customizeInfo}>
            <Text style={styles.cardTitle}>Share Your Progress</Text>
            <Text style={styles.cardSubtitle}>Make a card to send to your therapist or family</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// Rewards is an 8+ ("older") feature; the young (4-7) tab bar hides this route entirely
// (see app/(tabs)/_layout.tsx), so this screen only ever renders the older hub.
export default function RewardsScreen() {
  return <RewardsHubOlder />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 36,
    color: PALETTE.textDark,
  },
  starsPill: {
    backgroundColor: '#FFF9E8',
    borderWidth: 1.5,
    borderColor: PALETTE.yellow,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  starsPillText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 16,
    color: '#8B6A0E',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
    padding: 16,
    marginTop: 18,
    gap: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  cardTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 18,
    color: PALETTE.textDark,
  },
  cardSubtitle: {
    fontFamily: BODY_FONT,
    fontSize: 13,
    color: PALETTE.textMuted,
    marginTop: 4,
  },
  chevron: {
    fontFamily: BODY_BOLD,
    fontSize: 26,
    color: PALETTE.textMuted,
  },

  // Section 1
  customizeCard: {
    borderColor: PALETTE.brandBlue,
    borderWidth: 1.5,
  },
  customizeFinPreview: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: PALETTE.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizeInfo: {
    flex: 1,
  },
  newPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE9A8',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  newPillText: {
    fontFamily: BODY_BOLD,
    fontSize: 11,
    color: '#8B6A0E',
  },

  // Section 2
  masteryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  masteryBadgeWrap: {
    alignItems: 'center',
    gap: 4,
  },
  masteryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masteryBadgeIcon: {
    fontSize: 20,
  },
  masteryTierLabel: {
    fontFamily: BODY_SEMIBOLD,
    fontSize: 10,
  },

  // Section 3
  hqCard: {
    borderColor: PALETTE.coral,
    borderWidth: 1.5,
  },
  hqThumbnail: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#DCEFFB',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    gap: 4,
  },
  hqThumbSlot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hqThumbSlotIcon: {
    fontSize: 14,
  },
  visitButton: {
    backgroundColor: PALETTE.coral,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  visitButtonText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Section 4
  shareCard: {
    marginBottom: 12,
  },
  shareEmoji: {
    fontSize: 40,
  },
});
