import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CancellationVisualProps, CancellationWordGame, WORDS_PER_ROUND } from '@/components/games/cancellation-word-game';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['mountain', 'more', 'move', 'make', 'mind', 'must', 'might'];
const WORD_EMOJIS = ['🏔️', '➕', '🚶', '💡', '🧠', '❗', '💪'];
const HEIGHT_PER_WORD = 100;
const HEIGHT_TARGET = 700;

const LEDGE_OFFSETS = [88, 74, 60, 46, 32, 18, 4];

function ArcticRetryVisual({ completedIndices, activeIndex, step }: CancellationVisualProps) {
  const completedCount = completedIndices.filter(Boolean).length;
  const slipped = step === 'finish' || step === 'pause';
  const climberLedge = slipped ? Math.max(0, activeIndex - 1) : Math.min(activeIndex, WORDS.length - 1);

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.mountain}>
        {LEDGE_OFFSETS.map((bottom, i) => (
          <View key={i} style={[styles.ledge, { bottom: `${bottom}%` }]}>
            <Text style={styles.ledgeFlag}>{completedIndices[i] ? '🚩' : ''}</Text>
          </View>
        ))}
        <Text style={styles.summitStar}>⭐</Text>
        <Text
          style={[
            styles.climber,
            { bottom: `${LEDGE_OFFSETS[Math.min(climberLedge, LEDGE_OFFSETS.length - 1)]}%` },
          ]}>
          {slipped ? '😬' : '🧗'}
        </Text>
      </View>
      <Text style={styles.altitude}>{completedCount * HEIGHT_PER_WORD}m / {HEIGHT_TARGET}m</Text>
    </View>
  );
}

export default function ArcticRetryScreen() {
  const router = useRouter();

  return (
    <CancellationWordGame
      gameKey="arctic-retry"
      categoryKey="cancellation"
      title="Arctic Retry"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Finish, pause, breathe, try again! 🏔️"
      resultCompleteText="You reached the top! 🏔️"
      resultPartialText={(score) => `You climbed ${score * HEIGHT_PER_WORD}m of ${HEIGHT_TARGET}m!`}
      formatScore={(score) => `${score * HEIGHT_PER_WORD}m / ${HEIGHT_TARGET}m`}
      renderVisual={(props) => <ArcticRetryVisual {...props} />}
      renderFinale={({ score, stars, badgeUnlock, onPlayAgain }) => (
        <View style={styles.finaleContainer}>
          <Text style={styles.finaleConfetti}>🎉 🎊 ⭐ 🎊 🎉</Text>
          <Image source={require('@/assets/images/fin-allset.png')} style={styles.finaleFin} resizeMode="contain" />
          <Text style={styles.finaleTitle}>You reached the top! 🏔️</Text>
          <Text style={styles.finaleStars}>{'⭐'.repeat(stars) || '💪'}</Text>

          {score >= WORDS_PER_ROUND && (
            <>
              <Text style={styles.championText}>
                You completed all 20 Little Voices games! You&apos;re a BraveVoice Champion! 🏆
              </Text>
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeEmoji}>🏅</Text>
                <Text style={styles.seasonBadgeText}>Season 1 Complete!</Text>
              </View>
              <Text style={styles.teaserText}>Season 2 — The Thaw is coming soon! 🌊</Text>
            </>
          )}

          {badgeUnlock && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeCardEmoji}>🏅</Text>
              <Text style={styles.badgeCardText}>New badge unlocked! Arctic Retry {badgeUnlock} 🏅</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            onPress={() => Alert.alert('Share', 'Sharing is coming soon!')}>
            <Text style={styles.shareButtonText}>Share my achievement! 🎉</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.playAgainButton, pressed && styles.pressed]} onPress={onPlayAgain}>
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.backToGamesButton, pressed && styles.pressed]}
            onPress={() => router.back()}>
            <Text style={styles.backToGamesButtonText}>Back to Games</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mountain: {
    width: 160,
    height: 200,
    position: 'relative',
  },
  ledge: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  ledgeFlag: {
    fontSize: 16,
  },
  summitStar: {
    position: 'absolute',
    top: -8,
    left: '50%',
    fontSize: 22,
  },
  climber: {
    position: 'absolute',
    left: '40%',
    fontSize: 26,
  },
  altitude: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
    marginTop: 10,
  },
  finaleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  finaleConfetti: {
    fontSize: 22,
  },
  finaleFin: {
    width: 170,
    height: 219,
    marginTop: 4,
  },
  finaleTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 32,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
    marginTop: 8,
  },
  finaleStars: {
    fontSize: 30,
    marginTop: 10,
  },
  championText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.title,
    textAlign: 'center',
    marginTop: 14,
  },
  seasonBadge: {
    alignItems: 'center',
    backgroundColor: '#FCEFC7',
    borderWidth: 2,
    borderColor: '#F0B429',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 14,
  },
  seasonBadgeEmoji: {
    fontSize: 30,
  },
  seasonBadgeText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: '#8B6A0E',
    marginTop: 4,
  },
  teaserText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 10,
    textAlign: 'center',
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FCEFC7',
    borderWidth: 2,
    borderColor: '#F0B429',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  badgeCardEmoji: {
    fontSize: 24,
  },
  badgeCardText: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6A0E',
  },
  pressed: {
    opacity: 0.85,
  },
  shareButton: {
    backgroundColor: '#E8724A',
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  shareButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playAgainButton: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 12,
  },
  playAgainButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToGamesButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.progressActive,
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  backToGamesButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
});
