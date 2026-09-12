// Once-per-day open-ended check-in shown before Home. Softer, journal-like visual treatment
// (warm cream palette, no game chrome) distinct from gameplay. Purely reflective — no
// scoring, and the response is never surfaced back to the child as a grade.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { getTodaysQuestion } from '@/content/checkInQuestions';
import { useCheckIn } from '@/contexts/check-in-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { useVoiceRecorder } from '@/game-engine/useVoiceRecorder';

// A free-form journal note has no "wrong" length or scoring — it's pure record-until-stopped,
// so this uses the shared engine in manual end mode (no silence auto-cutoff at all) with a
// generous safety-net ceiling rather than a short word-attempt duration.
const VOICE_NOTE_MAX_DURATION_MS = 90000;

export function DailyCheckInScreen() {
  const { submitCheckIn } = useCheckIn();
  const question = getTodaysQuestion();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'type' | 'voice'>('type');
  const [voiceNoteRecorded, setVoiceNoteRecorded] = useState(false);

  const recorder = useVoiceRecorder({ endMode: 'manual', maxDurationMs: VOICE_NOTE_MAX_DURATION_MS });

  // `start()` resolves only once the note ends (manual stop or the safety-net ceiling) — fire
  // it and react to isRecording/isPrepping for the in-progress UI, then mark the note saved
  // once the promise actually resolves.
  const startVoiceNote = () => {
    recorder.start().then((result) => {
      if (!result.interrupted) setVoiceNoteRecorded(true);
    });
  };

  const stopVoiceNote = () => {
    recorder.stop();
  };

  const canSubmit = mode === 'type' ? text.trim().length > 0 : voiceNoteRecorded;

  const handleSubmit = () => {
    submitCheckIn({
      date: new Date().toISOString().slice(0, 10),
      question,
      textResponse: mode === 'type' ? text.trim() : '',
      hasVoiceNote: mode === 'voice' && voiceNoteRecorded,
    });
  };

  const handleSkip = () => {
    submitCheckIn({
      date: new Date().toISOString().slice(0, 10),
      question,
      textResponse: '',
      hasVoiceNote: false,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <FinCharacter state="idle" size={140} />
        <View style={styles.bubble}>
          <Text style={styles.question}>{question}</Text>
        </View>

        <View style={styles.modeRow}>
          <Pressable style={[styles.modeTab, mode === 'type' && styles.modeTabActive]} onPress={() => setMode('type')}>
            <Text style={[styles.modeTabText, mode === 'type' && styles.modeTabTextActive]}>✏️ Type</Text>
          </Pressable>
          <Pressable style={[styles.modeTab, mode === 'voice' && styles.modeTabActive]} onPress={() => setMode('voice')}>
            <Text style={[styles.modeTabText, mode === 'voice' && styles.modeTabTextActive]}>🎙️ Voice note</Text>
          </Pressable>
        </View>

        {mode === 'type' ? (
          <TextInput
            style={styles.input}
            placeholder="Tell Fin about it..."
            placeholderTextColor="#B9A98F"
            value={text}
            onChangeText={setText}
            multiline
          />
        ) : (
          <View style={styles.voiceArea}>
            <Pressable
              style={[styles.voiceButton, recorder.isRecording && styles.voiceButtonActive]}
              disabled={recorder.isPrepping}
              onPress={recorder.isRecording ? stopVoiceNote : startVoiceNote}>
              <Text style={styles.voiceButtonIcon}>{recorder.isRecording ? '⏹️' : '🎙️'}</Text>
            </Pressable>
            <Text style={styles.voiceHint}>
              {recorder.isPrepping
                ? 'Get ready…'
                : recorder.isRecording
                  ? 'Recording… tap to stop'
                  : voiceNoteRecorded
                    ? 'Voice note saved!'
                    : 'Tap to record'}
            </Text>
          </View>
        )}

        <Pressable style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Share with Fin</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for today</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF3E4',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EADCC0',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  question: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: '#5C4B2E',
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modeTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F2E6CE',
  },
  modeTabActive: {
    backgroundColor: '#D9A441',
  },
  modeTabText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: '#8A754E',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EADCC0',
    borderRadius: 18,
    padding: 16,
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: '#5C4B2E',
    textAlignVertical: 'top',
  },
  voiceArea: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  voiceButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#D9A441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#C4622F',
  },
  voiceButtonIcon: {
    fontSize: 30,
  },
  voiceHint: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: '#8A754E',
  },
  submitButton: {
    backgroundColor: '#D9A441',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: '#A08B63',
    textDecorationLine: 'underline',
  },
});
