// Screen A — Games List. One flat scrollable list for both age modes (no more category menus).
// The designed classic/board games (NEW_GAMES_CATALOG) are available to BOTH ages: 8+ mode lists
// just those; young (4-7) mode lists its own strategy games first, then the same classic games.
// Tapping any item goes to Screen B (Game Detail) — no game skips straight into play.

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { ALL_GAMES_ORDERED } from '@/constants/games-catalog';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

type ListItem = {
  key: string;
  title: string;
  description: string;
  iconImage?: number;
  iconEmoji?: string;
};

export default function GamesHubScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { mode } = useOnboarding();

  const classicItems: ListItem[] = NEW_GAMES_CATALOG.map((g) => ({
    key: g.key,
    title: g.title,
    description: g.description,
    iconEmoji: g.icon,
  }));
  const strategyItems: ListItem[] = ALL_GAMES_ORDERED.map((g) => ({
    key: g.key,
    title: g.title,
    description: g.howToPlay,
    iconImage: g.badge,
  }));

  // 8+ mode: just the classic/board games. Young mode: its strategy games, then the same classic
  // games so every designed game is playable at both ages.
  const items: ListItem[] = mode === 'older' ? classicItems : [...strategyItems, ...classicItems];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BraveVoiceHeader />
      <Text style={styles.title}>Games</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/(tabs)/games/detail/${item.key}` as never)}>
            {item.iconImage ? (
              <Image source={item.iconImage} style={styles.badgeImage} contentFit="contain" />
            ) : (
              <View style={styles.badgeEmojiWrap}>
                <Text style={styles.badgeEmoji}>{item.iconEmoji}</Text>
              </View>
            )}
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBlurb} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
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
  list: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 14,
  },
  cardPressed: {
    opacity: 0.85,
  },
  badgeImage: {
    width: 60,
    height: 56,
  },
  badgeEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EAF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  cardBlurb: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 3,
  },
  chevron: {
    fontSize: 22,
    color: '#B9CBD8',
    fontWeight: '700',
  },
});
