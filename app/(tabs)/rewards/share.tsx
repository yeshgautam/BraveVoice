import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { TIER_STYLES } from '@/components/games/game-badge';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useProgress } from '@/contexts/progress-context';
import { useRewardsState } from '@/contexts/rewards-context';
import { STRATEGIES, Strategy } from '@/contexts/strategy-context';

const PALETTE = {
  background: '#EEF6FB',
  card: '#FFFFFF',
  brandBlue: '#1A6FA8',
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

export default function ShareProgressScreen() {
  const router = useRouter();
  const { username } = useOnboarding();
  const { streakDays } = useProgress();
  const { totalStarsEarned, masteryByStrategy } = useRewardsState();
  const viewShotRef = useRef<ViewShot>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  const captureCard = async (): Promise<string | null> => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      return uri ?? null;
    } catch {
      Alert.alert('Oops!', "Couldn't create the image — try again.");
      return null;
    }
  };

  const handleSave = async () => {
    setBusy('save');
    try {
      const { granted } = await MediaLibrary.requestPermissionsAsync(true);
      if (!granted) {
        Alert.alert('We need permission', 'Turn on Photos access in Settings to save the progress card.');
        return;
      }
      const uri = await captureCard();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'The progress card was saved to Photos.');
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const uri = await captureCard();
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', "This device can't open the share sheet.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share progress card' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Share Progress</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <View style={styles.cardWrap}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.card}>
            <Text style={styles.cardBrand}>❄️ BraveVoice</Text>
            <Text style={styles.cardName}>{username || 'My'} Progress Card</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statValue}>{streakDays}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>⭐</Text>
                <Text style={styles.statValue}>{totalStarsEarned}</Text>
                <Text style={styles.statLabel}>Stars Earned</Text>
              </View>
            </View>

            <Text style={styles.masterySectionTitle}>Strategy Mastery</Text>
            <View style={styles.masteryGrid}>
              {STRATEGIES.map((strategy) => {
                const mastery = masteryByStrategy[strategy.key as Strategy];
                const colors = TIER_STYLES[mastery.tier];
                return (
                  <View key={strategy.key} style={styles.masteryItem}>
                    <View style={[styles.masteryBadge, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={styles.masteryBadgeIcon}>{strategy.icon}</Text>
                    </View>
                    <Text style={styles.masteryName}>{strategy.label}</Text>
                    <Text style={[styles.masteryTier, { color: colors.accent }]}>{colors.label}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.cardFooter}>Made with BraveVoice 🐧</Text>
          </View>
        </ViewShot>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, styles.saveButton, pressed && styles.pressed]}
          disabled={busy !== null}
          onPress={handleSave}>
          <Text style={[styles.actionButtonText, styles.saveButtonText]}>{busy === 'save' ? 'Saving…' : '💾 Save Image'}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionButton, styles.shareButton, pressed && styles.pressed]}
          disabled={busy !== null}
          onPress={handleShare}>
          <Text style={[styles.actionButtonText, styles.shareButtonText]}>{busy === 'share' ? 'Preparing…' : '📤 Share'}</Text>
        </Pressable>
      </View>
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
  backButtonSpacer: {
    width: 68,
  },
  screenTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 18,
    color: PALETTE.textDark,
  },
  pressed: {
    opacity: 0.85,
  },
  cardWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  card: {
    width: 320,
    backgroundColor: '#0B3D5C',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  cardBrand: {
    fontFamily: TITLE_FONT,
    fontSize: 16,
    color: '#BEE3F8',
  },
  cardName: {
    fontFamily: TITLE_FONT,
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
  },
  statValue: {
    fontFamily: TITLE_FONT,
    fontSize: 26,
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontFamily: BODY_SEMIBOLD,
    fontSize: 11,
    color: '#BEE3F8',
    marginTop: 2,
  },
  masterySectionTitle: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 12,
    color: '#BEE3F8',
    letterSpacing: 0.5,
    marginTop: 24,
    alignSelf: 'flex-start',
  },
  masteryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    gap: 10,
  },
  masteryItem: {
    width: '30%',
    alignItems: 'center',
  },
  masteryBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masteryBadgeIcon: {
    fontSize: 18,
  },
  masteryName: {
    fontFamily: BODY_BOLD,
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  masteryTier: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 10,
    marginTop: 2,
  },
  cardFooter: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    color: '#7BA8C4',
    marginTop: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  actionButton: {
    flex: 1,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: PALETTE.brandBlue,
  },
  shareButton: {
    backgroundColor: PALETTE.brandBlue,
  },
  actionButtonText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 15,
  },
  saveButtonText: {
    color: PALETTE.brandBlue,
  },
  shareButtonText: {
    color: '#FFFFFF',
  },
});
