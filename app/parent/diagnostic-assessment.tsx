// Sound Diagnostic Assessment (Phase 10). Entry point lives in the Parent section (not
// child-facing navigation), but the child takes the actual test — hand the device over after
// starting it. Baseline pass applies no strategy; the bonus pass re-tests the toughest words
// against each of the 7 strategies to surface which one helps most. Results are shown only
// here, never to the child as a score.

import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveWaveform } from '@/components/games/live-waveform';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { DIAGNOSTIC_WORDS, DiagnosticWord, SOUND_CATEGORIES, SOUND_CATEGORY_LABEL } from '@/content/diagnosticWords';
import { DiagnosticRun, DiagnosticWordResult, StrategyEffectivenessResult, useDiagnostic } from '@/contexts/diagnostic-context';
import { STRATEGIES, Strategy } from '@/contexts/strategy-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { useDiagnosticRecording } from '@/game-engine/useDiagnosticRecording';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';

type Phase = 'intro' | 'baseline' | 'bonusIntro' | 'bonus' | 'results';

const BONUS_WORDS_PER_STRATEGY = 2;

export default function DiagnosticAssessmentScreen() {
  const router = useRouter();
  const { runs, addRun } = useDiagnostic();
  const previousRun = runs.length > 0 ? runs[runs.length - 1] : null;

  const [phase, setPhase] = useState<Phase>('intro');
  const [wordIndex, setWordIndex] = useState(0);
  const [wordResults, setWordResults] = useState<DiagnosticWordResult[]>([]);
  const [bonusPairs, setBonusPairs] = useState<{ strategy: Strategy; word: string }[]>([]);
  const [bonusIndex, setBonusIndex] = useState(0);
  const [bonusResults, setBonusResults] = useState<StrategyEffectivenessResult[]>([]);
  const [noSpeechNote, setNoSpeechNote] = useState(false);

  const diagnosticRecording = useDiagnosticRecording();
  const currentWord: DiagnosticWord | null = DIAGNOSTIC_WORDS[wordIndex] ?? null;
  const currentBonus = bonusPairs[bonusIndex] ?? null;
  const bonusSpeechMetric = useSpeechMetric(currentBonus?.strategy ?? 'easyOnset');

  const finishedRunRef = useRef<DiagnosticRun | null>(null);

  const startBaseline = () => {
    setPhase('baseline');
    setWordIndex(0);
    setWordResults([]);
  };

  const recordBaselineWord = async () => {
    if (diagnosticRecording.isRecording) {
      diagnosticRecording.stop();
      return;
    }
    if (!currentWord || diagnosticRecording.isPrepping) return;
    setNoSpeechNote(false);
    const result = await diagnosticRecording.start();
    if (diagnosticRecording.permissionDenied) return;
    if (result.noSpeechDetected) {
      setNoSpeechNote(true);
      setTimeout(() => setNoSpeechNote(false), 1600);
      return;
    }

    const next = [...wordResults, { word: currentWord.word, category: currentWord.category, struggled: result.struggled, flags: result.flags }];
    setWordResults(next);

    if (wordIndex + 1 >= DIAGNOSTIC_WORDS.length) {
      const struggledWords = next.filter((w) => w.struggled).map((w) => w.word);
      const pickedWords = struggledWords.slice(0, 6);
      if (pickedWords.length === 0) {
        finishRun(next, []);
        return;
      }
      const pairs: { strategy: Strategy; word: string }[] = [];
      STRATEGIES.forEach((s, i) => {
        for (let j = 0; j < BONUS_WORDS_PER_STRATEGY; j++) {
          pairs.push({ strategy: s.key, word: pickedWords[(i * BONUS_WORDS_PER_STRATEGY + j) % pickedWords.length] });
        }
      });
      setBonusPairs(pairs);
      setPhase('bonusIntro');
    } else {
      setWordIndex((i) => i + 1);
    }
  };

  const recordBonusAttempt = async () => {
    if (bonusSpeechMetric.isRecording) {
      bonusSpeechMetric.stop();
      return;
    }
    if (!currentBonus || bonusSpeechMetric.isPrepping) return;
    setNoSpeechNote(false);
    const result = await bonusSpeechMetric.start();
    if (bonusSpeechMetric.permissionDenied) return;
    if (result.noSpeechDetected) {
      setNoSpeechNote(true);
      setTimeout(() => setNoSpeechNote(false), 1600);
      return;
    }

    const next = [...bonusResults, { strategy: currentBonus.strategy, word: currentBonus.word, success: result.success }];
    setBonusResults(next);

    if (bonusIndex + 1 >= bonusPairs.length) {
      finishRun(wordResults, next);
    } else {
      setBonusIndex((i) => i + 1);
    }
  };

  const finishRun = (words: DiagnosticWordResult[], strategyResults: StrategyEffectivenessResult[]) => {
    const run: DiagnosticRun = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      wordResults: words,
      strategyResults,
    };
    finishedRunRef.current = run;
    addRun(run);
    setPhase('results');
  };

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <Pressable style={({ pressed }) => [styles.backLink, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>‹ Back</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <FinCharacter state="idle" size={150} />
          <Text style={styles.title}>Sound Diagnostic Assessment</Text>
          <Text style={styles.body}>
            Hand the device to your child. Fin will show {DIAGNOSTIC_WORDS.length} words, one at a time — no
            strategy, just natural, unhurried speech. It takes about 5 minutes.
          </Text>
          {previousRun && (
            <Text style={styles.previousNote}>
              Last run: {new Date(previousRun.date).toLocaleDateString()}
            </Text>
          )}
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={startBaseline}>
            <Text style={styles.primaryButtonText}>Start Assessment</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'baseline' && currentWord) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.progressText}>
            Word {wordIndex + 1} of {DIAGNOSTIC_WORDS.length}
          </Text>
          <FinCharacter
            state={diagnosticRecording.isProcessing ? 'thinking' : diagnosticRecording.isRecording ? 'listening' : 'idle'}
            size={140}
          />
          <Text style={styles.finPrompt}>
            {diagnosticRecording.isPrepping
              ? 'Get ready…'
              : diagnosticRecording.isRecording
                ? 'Listening…'
                : diagnosticRecording.isProcessing
                  ? 'Thinking…'
                  : noSpeechNote
                    ? "Didn't catch that — try again! 💛"
                    : 'Just say it naturally, take your time'}
          </Text>
          <View style={styles.wordBubble}>
            <Text style={styles.wordText}>{currentWord.word.toUpperCase()}</Text>
          </View>
          {diagnosticRecording.isRecording && (
            <LiveWaveform levels={diagnosticRecording.liveWaveform} color={OnboardingPalette.progressActive} height={30} />
          )}
          <Pressable
            style={({ pressed }) => [
              styles.micButton,
              diagnosticRecording.isRecording && styles.micButtonActive,
              pressed && styles.pressed,
            ]}
            disabled={diagnosticRecording.isPrepping || diagnosticRecording.isProcessing}
            onPress={recordBaselineWord}>
            <Text style={styles.micIcon}>🎤</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'bonusIntro') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <FinCharacter state="encouraging" size={140} />
          <Text style={styles.title}>Nice work!</Text>
          <Text style={styles.body}>
            Now let&apos;s try your trickiest words a few different ways, to see what helps most.
          </Text>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => setPhase('bonus')}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
          <Pressable style={styles.skipLink} onPress={() => finishRun(wordResults, [])}>
            <Text style={styles.skipLinkText}>Skip this part</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'bonus' && currentBonus) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.progressText}>
            {bonusIndex + 1} of {bonusPairs.length}
          </Text>
          <FinCharacter
            state={bonusSpeechMetric.isProcessing ? 'thinking' : bonusSpeechMetric.isRecording ? 'listening' : 'idle'}
            size={140}
          />
          <Text style={styles.finPrompt}>
            {bonusSpeechMetric.isPrepping
              ? 'Get ready…'
              : bonusSpeechMetric.isRecording
                ? 'Listening…'
                : bonusSpeechMetric.isProcessing
                  ? 'Thinking…'
                  : noSpeechNote
                    ? "Didn't catch that — try again! 💛"
                    : `Strategy: ${STRATEGIES.find((s) => s.key === currentBonus.strategy)?.label}`}
          </Text>
          <View style={styles.wordBubble}>
            <Text style={styles.wordText}>{currentBonus.word.toUpperCase()}</Text>
          </View>
          {bonusSpeechMetric.isRecording && (
            <LiveWaveform levels={bonusSpeechMetric.liveWaveform} color={OnboardingPalette.progressActive} height={30} />
          )}
          <Pressable
            style={({ pressed }) => [
              styles.micButton,
              bonusSpeechMetric.isRecording && styles.micButtonActive,
              pressed && styles.pressed,
            ]}
            disabled={bonusSpeechMetric.isPrepping || bonusSpeechMetric.isProcessing}
            onPress={recordBonusAttempt}>
            <Text style={styles.micIcon}>🎤</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'results') {
    return <ResultsView run={finishedRunRef.current} previousRun={previousRun} onDone={() => router.back()} />;
  }

  return null;
}

function ResultsView({
  run,
  previousRun,
  onDone,
}: {
  run: DiagnosticRun | null;
  previousRun: DiagnosticRun | null;
  onDone: () => void;
}) {
  const categoryBreakdown = useMemo(() => {
    if (!run) return [];
    return SOUND_CATEGORIES.map((cat) => {
      const words = run.wordResults.filter((w) => w.category === cat);
      const struggled = words.filter((w) => w.struggled).length;
      return { category: cat, struggled, total: words.length };
    }).filter((c) => c.total > 0);
  }, [run]);

  const sortedByDifficulty = useMemo(
    () => [...categoryBreakdown].sort((a, b) => b.struggled / b.total - a.struggled / a.total),
    [categoryBreakdown]
  );

  const strategyEffectiveness = useMemo(() => {
    if (!run || run.strategyResults.length === 0) return null;
    const byStrategy = new Map<Strategy, { success: number; total: number }>();
    for (const r of run.strategyResults) {
      const entry = byStrategy.get(r.strategy) ?? { success: 0, total: 0 };
      entry.total += 1;
      if (r.success) entry.success += 1;
      byStrategy.set(r.strategy, entry);
    }
    const ranked = Array.from(byStrategy.entries())
      .map(([strategy, v]) => ({ strategy, rate: v.total > 0 ? v.success / v.total : 0 }))
      .sort((a, b) => b.rate - a.rate);
    return ranked.length > 0 ? ranked[0] : null;
  }, [run]);

  const previousCategoryBreakdown = useMemo(() => {
    if (!previousRun) return null;
    return SOUND_CATEGORIES.map((cat) => {
      const words = previousRun.wordResults.filter((w) => w.category === cat);
      const struggled = words.filter((w) => w.struggled).length;
      return { category: cat, struggled, total: words.length };
    }).filter((c) => c.total > 0);
  }, [previousRun]);

  if (!run) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Results</Text>
        <Text style={styles.body}>Baseline pass — {run.wordResults.length} words, no strategy applied.</Text>

        <Text style={styles.sectionHeading}>Most difficulty</Text>
        {sortedByDifficulty.slice(0, 2).map((c) => (
          <Text key={c.category} style={styles.resultLine}>
            {SOUND_CATEGORY_LABEL[c.category]} ({c.struggled}/{c.total} words)
          </Text>
        ))}

        <Text style={styles.sectionHeading}>Least difficulty</Text>
        {[...sortedByDifficulty]
          .reverse()
          .slice(0, 2)
          .map((c) => (
            <Text key={c.category} style={styles.resultLine}>
              {SOUND_CATEGORY_LABEL[c.category]} ({c.struggled}/{c.total})
            </Text>
          ))}

        {strategyEffectiveness && (
          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationLabel}>Try starting with:</Text>
            <Text style={styles.recommendationValue}>
              {STRATEGIES.find((s) => s.key === strategyEffectiveness.strategy)?.label}
            </Text>
          </View>
        )}

        {previousCategoryBreakdown && (
          <>
            <Text style={styles.sectionHeading}>Compared to last run</Text>
            {categoryBreakdown.map((c) => {
              const prev = previousCategoryBreakdown.find((p) => p.category === c.category);
              if (!prev) return null;
              const delta = c.struggled / c.total - prev.struggled / prev.total;
              return (
                <Text key={c.category} style={styles.resultLine}>
                  {SOUND_CATEGORY_LABEL[c.category]}: {delta <= 0 ? '↓ improved' : '↑ more difficulty'}
                </Text>
              );
            })}
          </>
        )}

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            This is a helpful pattern snapshot, not a clinical diagnosis — please use your professional judgment
            alongside these results.
          </Text>
        </View>

        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onDone}>
          <Text style={styles.primaryButtonText}>Done</Text>
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
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backLink: {
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    lineHeight: 20,
  },
  previousNote: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  primaryButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  skipLink: {
    marginTop: 4,
    paddingVertical: 8,
  },
  skipLinkText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    textDecorationLine: 'underline',
  },
  progressText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.subtitle,
  },
  finPrompt: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
  },
  wordBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  wordText: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    color: OnboardingPalette.title,
    letterSpacing: 1,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: OnboardingPalette.progressActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  micButtonActive: {
    opacity: 0.85,
  },
  micIcon: {
    fontSize: 30,
  },
  pressed: {
    opacity: 0.85,
  },
  resultsContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 4,
  },
  sectionHeading: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 18,
    marginBottom: 4,
  },
  resultLine: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    marginBottom: 2,
  },
  recommendationCard: {
    backgroundColor: '#EAF6FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    alignItems: 'center',
  },
  recommendationLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: OnboardingPalette.subtitle,
  },
  recommendationValue: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 2,
  },
  disclaimerCard: {
    backgroundColor: '#FFF6E0',
    borderRadius: 14,
    padding: 14,
    marginTop: 22,
  },
  disclaimerText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: '#8A754E',
    lineHeight: 18,
    textAlign: 'center',
  },
});
