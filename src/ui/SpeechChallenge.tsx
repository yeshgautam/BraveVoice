import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { FONT, Palette } from '../game/palette';
import { SOUND_SETS, type WordCard } from '../game/words';
import { useVoiceMeter } from '../game/useVoiceMeter';
import { STATIONS } from '../game/world';

type Props = {
  stationId: string;
  wordIndex: number;
  muted: boolean;
  onAward: (stars: number) => void;
  onClose: () => void;
};

type Stage = 'intro' | 'listening' | 'result';

const HOLD_TARGET_LEVEL = 0.28;

export function SpeechChallenge({ stationId, wordIndex, muted, onAward, onClose }: Props) {
  const station = STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];
  const set = SOUND_SETS[station.setIndex];
  const card: WordCard = set.words[Math.min(wordIndex, set.words.length - 1)];

  const { permission, level, isRecording, start, stop } = useVoiceMeter();
  const [stage, setStage] = useState<Stage>('intro');
  const [held, setHeld] = useState(0);
  const [stars, setStars] = useState(0);
  const [peak, setPeak] = useState(0);

  const heldRef = useRef(0);
  const peakRef = useRef(0);
  const levelRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finished = useRef(false);

  const meterWidth = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const pulse = useSharedValue(1);

  levelRef.current = level;

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 180 });
    pulse.value = withRepeat(withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      cancelAnimation(cardScale);
      cancelAnimation(pulse);
    };
  }, [cardScale, pulse]);

  useEffect(() => {
    meterWidth.value = withTiming(level, { duration: 90, easing: Easing.out(Easing.quad) });
  }, [level, meterWidth]);

  const speakPrompt = useCallback(
    (text: string, rate = 0.62) => {
      if (muted) return;
      Speech.stop();
      Speech.speak(text, { rate, pitch: 1.05, language: 'en-US' });
    },
    [muted],
  );

  useEffect(() => {
    speakPrompt(`Say. ${card.word}`, 0.55);
    return () => {
      Speech.stop();
    };
  }, [card.word, speakPrompt]);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const finish = useCallback(
    async (earned: number) => {
      if (finished.current) return;
      finished.current = true;
      clearTimer();
      await stop();
      setStars(earned);
      setStage('result');
      Haptics.notificationAsync(
        earned >= 2 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      const praise =
        earned >= 3
          ? `Brilliant! ${card.word}.`
          : earned === 2
            ? `Nice try! ${card.word}.`
            : `Good effort. Let's try ${card.word} again soon.`;
      speakPrompt(praise, 0.6);
    },
    [card.word, clearTimer, speakPrompt, stop],
  );

  const beginListening = useCallback(async () => {
    finished.current = false;
    heldRef.current = 0;
    peakRef.current = 0;
    setHeld(0);
    setPeak(0);
    setStage('listening');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const usingMic = permission === 'granted' ? await start() : false;
    const tickMs = 100;
    let elapsed = 0;

    clearTimer();
    timer.current = setInterval(() => {
      elapsed += tickMs;
      // Without a working microphone the meter follows a gentle guide pulse so a
      // child can still practise and finish the round.
      const value = usingMic ? levelRef.current : 0.45 + 0.3 * Math.sin(elapsed / 420);
      peakRef.current = Math.max(peakRef.current, value);
      setPeak(peakRef.current);
      if (value >= HOLD_TARGET_LEVEL) {
        heldRef.current += tickMs / 1000;
        setHeld(heldRef.current);
      }
      if (heldRef.current >= card.holdSeconds) {
        const strong = peakRef.current > 0.62 ? 3 : 2;
        finish(usingMic ? strong : 2);
      } else if (elapsed >= 7000) {
        finish(heldRef.current > card.holdSeconds * 0.45 ? 2 : 1);
      }
    }, tickMs);
  }, [card.holdSeconds, clearTimer, finish, permission, start]);

  useEffect(
    () => () => {
      clearTimer();
      Speech.stop();
      stop();
    },
    [clearTimer, stop],
  );

  const meterStyle = useAnimatedStyle(() => ({ width: `${Math.round(meterWidth.value * 100)}%` }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const micStyle = useAnimatedStyle(() => ({ transform: [{ scale: stage === 'listening' ? pulse.value : 1 }] }));
  const progress = Math.min(1, held / card.holdSeconds);

  return (
    <View style={styles.backdrop}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient colors={['rgba(16,34,60,0.97)', 'rgba(9,20,38,0.99)']} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <View style={styles.soundBadge}>
            <Text style={styles.soundBadgeText}>{set.sound}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stationTitle}>{set.title}</Text>
            <Text style={styles.coach}>{set.coach}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={14} style={styles.close} accessibilityLabel="Close this station">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.emoji}>{card.emoji}</Text>
        <Text style={styles.word}>{card.word}</Text>
        <Text style={styles.hint}>{card.hint}</Text>

        {stage !== 'result' && (
          <>
            <View style={styles.meterTrack}>
              <Animated.View style={[styles.meterFill, meterStyle]}>
                <LinearGradient
                  colors={['#00BFFF', '#7DF9FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <View style={[styles.meterTarget, { left: `${HOLD_TARGET_LEVEL * 100}%` }]} />
            </View>
            <View style={styles.progressRow}>
              {Array.from({ length: 10 }, (_, i) => (
                <View key={i} style={[styles.progressPip, progress * 10 > i && styles.progressPipOn]} />
              ))}
            </View>
            <Text style={styles.meterLabel}>
              {stage === 'listening'
                ? `Keep going! ${held.toFixed(1)}s of ${card.holdSeconds.toFixed(1)}s`
                : 'Tap the microphone, then say the word in your bravest voice.'}
            </Text>
          </>
        )}

        {stage === 'result' && (
          <View style={styles.resultBlock}>
            <View style={styles.starRow}>
              {[0, 1, 2].map((i) => (
                <Text key={i} style={[styles.star, i < stars && styles.starOn]}>
                  ★
                </Text>
              ))}
            </View>
            <Text style={styles.resultText}>
              {stars >= 3 ? 'Brilliant brave voice!' : stars === 2 ? 'Great try — nearly perfect!' : 'Good effort. Every try counts.'}
            </Text>
            <Text style={styles.resultDetail}>Loudest moment {Math.round(peak * 100)}% · held {held.toFixed(1)}s</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={styles.secondary}
            onPress={() => speakPrompt(card.word, 0.5)}
            accessibilityLabel={`Hear the word ${card.word}`}
          >
            <Text style={styles.secondaryText}>🔊  Hear it</Text>
          </Pressable>

          {stage === 'result' ? (
            <Pressable
              style={styles.primary}
              onPress={() => onAward(stars)}
              accessibilityLabel="Collect your stars and continue"
            >
              <Text style={styles.primaryText}>Collect ★{stars}</Text>
            </Pressable>
          ) : (
            <Animated.View style={micStyle}>
              <Pressable
                style={[styles.primary, stage === 'listening' && styles.primaryActive]}
                onPress={stage === 'listening' ? () => finish(held > 0.2 ? 2 : 1) : beginListening}
                accessibilityLabel={stage === 'listening' ? 'Finish this attempt' : 'Start speaking'}
              >
                <Text style={styles.primaryText}>{stage === 'listening' ? '■  Done' : '🎤  Say it'}</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        {permission === 'denied' && (
          <Text style={styles.permissionNote}>
            Microphone is off, so this round runs in practice mode. Turn the mic on in Settings to score your voice.
          </Text>
        )}
        {isRecording && <Text style={styles.recording}>● Listening</Text>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(100,160,255,0.55)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  soundBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,191,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(125,249,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundBadgeText: { fontFamily: FONT, fontSize: 22, color: Palette.crystalCore },
  stationTitle: { fontFamily: FONT, fontSize: 20, color: '#FFFFFF' },
  coach: { fontSize: 13, color: 'rgba(200,225,255,0.75)', marginTop: 2, lineHeight: 18 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  closeText: { color: '#FFFFFF', fontSize: 16 },
  emoji: { fontSize: 74, textAlign: 'center', marginTop: 8 },
  word: { fontFamily: FONT, fontSize: 46, color: '#FFFFFF', textAlign: 'center', letterSpacing: 2 },
  hint: { fontSize: 15, color: 'rgba(200,225,255,0.8)', textAlign: 'center', marginTop: 6, marginBottom: 18 },
  meterTrack: {
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125,249,255,0.35)',
  },
  meterFill: { height: '100%' },
  meterTarget: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,208,128,0.9)' },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'center' },
  progressPip: { width: 22, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressPipOn: { backgroundColor: Palette.lanternGold },
  meterLabel: { fontSize: 13, color: 'rgba(200,225,255,0.8)', textAlign: 'center', marginTop: 10, minHeight: 34 },
  resultBlock: { alignItems: 'center', marginVertical: 6 },
  starRow: { flexDirection: 'row', gap: 10 },
  star: { fontSize: 44, color: 'rgba(255,255,255,0.18)' },
  starOn: { color: Palette.lanternGold },
  resultText: { fontFamily: FONT, fontSize: 20, color: '#FFFFFF', marginTop: 6 },
  resultDetail: { fontSize: 12, color: 'rgba(200,225,255,0.6)', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  secondary: {
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(160,210,255,0.4)',
  },
  secondaryText: { fontFamily: FONT, fontSize: 16, color: '#FFFFFF' },
  primary: {
    paddingHorizontal: 28,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,140,220,0.85)',
    borderWidth: 2,
    borderColor: 'rgba(160,230,255,0.85)',
  },
  primaryActive: { backgroundColor: 'rgba(220,80,80,0.85)', borderColor: 'rgba(255,190,190,0.9)' },
  primaryText: { fontFamily: FONT, fontSize: 17, color: '#FFFFFF' },
  permissionNote: { fontSize: 12, color: 'rgba(255,208,128,0.85)', textAlign: 'center', marginTop: 14, lineHeight: 17 },
  recording: { position: 'absolute', top: 14, right: 58, color: '#FF6B6B', fontSize: 12, fontFamily: FONT },
});
