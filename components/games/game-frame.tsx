// Shared chrome for the 18 classic/board games, reproduced from the design export. Every one of
// those screens shares this exact frame:
//   • a slate header bar (‹ back, centered UPPERCASE title, ? help) with an orange underline
//   • the game's own content in the white body
//   • a bottom row: a round white mic + live waveform on the left, and the Fin penguin standing
//     on a navy "• WORD •" pill on the right (the pill shows the current target word).
// Purely presentational — each game owns its own useSpeechMetric loop and game state and passes
// the mic handler + current word in, the same way tic-tac-toe-game.tsx composes the primitives.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveWaveform } from '@/components/games/live-waveform';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';

type WaveformLevels = React.ComponentProps<typeof LiveWaveform>['levels'];

export type GameFrameProps = {
  title: string;
  /** Shown inside the navy pill under the penguin — the word the player says this turn. */
  currentWord: string;
  onMicPress: () => void;
  isRecording?: boolean;
  micDisabled?: boolean;
  waveformLevels?: WaveformLevels;
  /** Overrides the built-in help popover; if omitted, tapping ? shows `helpText`. */
  onHelp?: () => void;
  helpText?: string;
  children: ReactNode;
};

export function GameFrame({
  title,
  currentWord,
  onMicPress,
  isRecording,
  micDisabled,
  waveformLevels,
  onHelp,
  helpText = 'Tap the microphone and say the word on the pill to take your turn. Speak clearly and have fun!',
  children,
}: GameFrameProps) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <View style={styles.root}>
      <View style={styles.headerBlock}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Pressable hitSlop={12} onPress={() => router.back()} style={styles.headerSide}>
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
            <Pressable
              hitSlop={12}
              onPress={() => (onHelp ? onHelp() : setShowHelp(true))}
              style={styles.headerSide}
              accessibilityLabel="How to play">
              <View style={styles.helpCircle}>
                <Text style={styles.helpMark}>?</Text>
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.orangeLine} />
      </View>

      <View style={styles.content}>{children}</View>

      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          <View style={styles.micCol}>
            <Pressable
              onPress={onMicPress}
              disabled={micDisabled}
              style={({ pressed }) => [styles.micButton, isRecording && styles.micButtonActive, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Speak">
              <Text style={styles.micIcon}>🎤</Text>
            </Pressable>
            <View style={styles.waveSlot}>
              {waveformLevels ? <LiveWaveform levels={waveformLevels} color={MockupPalette.navy} height={22} /> : null}
            </View>
          </View>

          <View style={styles.rightCol}>
            <Image source={require('@/assets/images/fin-character.png')} style={styles.penguin} contentFit="contain" />
            <View style={styles.rainbowPill}>
              <Text style={styles.rainbowDot}>•</Text>
              <Text style={styles.rainbowWord} numberOfLines={1}>
                {currentWord.toUpperCase()}
              </Text>
              <Text style={styles.rainbowDot}>•</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {showHelp && (
        <View style={styles.helpOverlay}>
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>How to play</Text>
            <Text style={styles.helpBody}>{helpText}</Text>
            <Pressable style={({ pressed }) => [styles.helpDoneBtn, pressed && styles.pressed]} onPress={() => setShowHelp(false)}>
              <Text style={styles.helpDoneText}>Got it!</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MockupPalette.pageBg,
  },
  headerBlock: {
    backgroundColor: MockupPalette.header,
  },
  headerSafe: {
    backgroundColor: MockupPalette.header,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerSide: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  helpCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpMark: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -1,
  },
  orangeLine: {
    height: 4,
    backgroundColor: MockupPalette.orange,
  },
  content: {
    flex: 1,
  },
  bottomSafe: {
    backgroundColor: MockupPalette.pageBg,
  },
  bottomBar: {
    flexDirection: 'row',
    // Align the mic+waveform column's BOTTOM with the pill/penguin column's bottom; the pill's
    // marginBottom then lifts it so the mic and pill share the same horizontal line.
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 26,
    paddingRight: 14,
    paddingTop: 2,
    paddingBottom: 4,
  },
  micCol: {
    alignItems: 'center',
    gap: 6,
  },
  waveSlot: {
    width: 64,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: MockupPalette.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  micButtonActive: {
    borderColor: MockupPalette.orange,
    backgroundColor: '#FFF4F0',
  },
  micIcon: {
    fontSize: 26,
  },
  rightCol: {
    alignItems: 'center',
  },
  penguin: {
    width: 86,
    height: 98,
    marginBottom: -8,
    zIndex: 2,
  },
  rainbowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
    backgroundColor: MockupPalette.pillNavy,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 26,
    // Lift the pill off the bottom so its vertical center lines up with the mic on the left,
    // leaving the waveform to sit under the mic below the pill's line.
    marginBottom: 37,
  },
  rainbowDot: {
    fontSize: 16,
    color: MockupPalette.amber,
    fontWeight: '900',
  },
  rainbowWord: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  helpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,32,59,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
  },
  helpTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  helpBody: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: MockupPalette.title,
    textAlign: 'center',
    lineHeight: 22,
  },
  helpDoneBtn: {
    backgroundColor: MockupPalette.navy,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  helpDoneText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
