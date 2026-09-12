import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BraveVoiceHeader } from '@/components/brave-voice-header';
import { bestStarsToTier, GameBadge } from '@/components/games/game-badge';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useProgress } from '@/contexts/progress-context';

export type GameEntry = {
  key: string;
  title: string;
  description: string;
  badge: number;
  route?: string;
};

export function GameCategoryScreen({
  title,
  description,
  games,
}: {
  title: string;
  description?: string;
  games: GameEntry[];
}) {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <BraveVoiceHeader />
      </View>

      <View style={styles.titlePill}>
        <Text style={styles.titleText}>{title}</Text>
      </View>
      {description && (
        <View style={styles.descriptionPill}>
          <Text style={styles.descriptionPillText}>{description}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}>
        {games.map((game) => (
          <GameRow key={game.key} game={game} onPlay={() => handlePlay(game, router)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function handlePlay(game: GameEntry, router: ReturnType<typeof useRouter>) {
  if (game.route) {
    router.push(game.route as never);
  } else {
    Alert.alert('Coming soon!', `${game.title} is still being built — check back soon!`);
  }
}

function GameRow({ game, onPlay }: { game: GameEntry; onPlay: () => void }) {
  const { gameStats } = useProgress();
  const tier = bestStarsToTier(gameStats[game.key]?.bestStars ?? 0);

  return (
    <View style={styles.card}>
      <GameBadge source={game.badge} tier={tier} size={84} />
      <Text style={styles.rowTitle}>{game.title}</Text>
      <Text style={styles.rowDescription}>{game.description}</Text>
      <Pressable style={({ pressed }) => [styles.playButton, pressed && styles.pressed]} onPress={onPlay}>
        <Text style={styles.playButtonText}>Play</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 8,
    backgroundColor: '#FFE3E9',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  backButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: '#7C4DFF',
  },
  titlePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  titleText: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  descriptionPill: {
    alignSelf: 'center',
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  descriptionPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  rowTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
    color: OnboardingPalette.title,
    textAlign: 'center',
    marginTop: 12,
  },
  rowDescription: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 4,
  },
  playButton: {
    backgroundColor: '#FBE7B6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 14,
  },
  playButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: '#7A5A15',
  },
  pressed: {
    opacity: 0.8,
  },
});
