import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DIFFICULTY_LEVELS,
  DifficultyLevel,
  FLUENCY_SHAPING_TECHNIQUES,
  FluencyTechnique,
  GAME_OPTIONS,
  getStudent,
  STUTTERING_MODIFICATION_TECHNIQUES,
} from '@/constants/therapist-data';
import { BodyBold, BodyFont, BodySemibold, TherapistPalette, TitleFont } from '@/constants/therapist-theme';

type TechniqueState = {
  enabled: boolean;
  difficulty: DifficultyLevel;
  repetitions: number;
  game: string;
  gamePickerOpen: boolean;
};

function initialState(technique: FluencyTechnique, enabled: boolean): TechniqueState {
  const games = GAME_OPTIONS[technique.key] ?? [];
  return {
    enabled,
    difficulty: 'Words',
    repetitions: 10,
    game: games[0] ?? '',
    gamePickerOpen: false,
  };
}

export default function AssignHomeworkScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const student = getStudent(id ?? '');

  const [states, setStates] = useState<Record<string, TechniqueState>>(() => {
    const initial: Record<string, TechniqueState> = {};
    FLUENCY_SHAPING_TECHNIQUES.forEach((t) => {
      initial[t.key] = initialState(t, t.key === 'easy-onset');
    });
    STUTTERING_MODIFICATION_TECHNIQUES.forEach((t) => {
      initial[t.key] = initialState(t, false);
    });
    return initial;
  });

  if (!student) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.notFound}>Student not found.</Text>
      </SafeAreaView>
    );
  }

  const updateState = (key: string, patch: Partial<TechniqueState>) => {
    setStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const enabledEntries = Object.entries(states).filter(([, s]) => s.enabled);
  const firstEnabled = enabledEntries[0]?.[1] ?? null;

  const renderTechnique = (technique: FluencyTechnique) => {
    const state = states[technique.key];
    const games = GAME_OPTIONS[technique.key] ?? [];
    return (
      <View key={technique.key} style={styles.techniqueCard}>
        <View style={styles.techniqueHeaderRow}>
          <View style={[styles.techniqueIconCircle, { backgroundColor: `${technique.color}22` }]}>
            <Text style={styles.techniqueIconEmoji}>{technique.icon}</Text>
          </View>
          <View style={styles.techniqueText}>
            <Text style={styles.techniqueName}>{technique.name}</Text>
            <Text style={styles.techniqueDescription}>{technique.description}</Text>
          </View>
          <Switch
            value={state.enabled}
            onValueChange={(value) => updateState(technique.key, { enabled: value })}
            trackColor={{ false: TherapistPalette.border, true: TherapistPalette.brandBlue }}
          />
        </View>

        {state.enabled && (
          <View style={styles.techniqueExpanded}>
            <Text style={styles.expandedLabel}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  style={[styles.difficultyPill, state.difficulty === level && styles.difficultyPillActive]}
                  onPress={() => updateState(technique.key, { difficulty: level })}>
                  <Text
                    style={[
                      styles.difficultyPillText,
                      state.difficulty === level && styles.difficultyPillTextActive,
                    ]}>
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.expandedLabel}>Repetitions</Text>
            <View style={styles.repsRow}>
              <Pressable
                style={styles.repsButton}
                onPress={() =>
                  updateState(technique.key, { repetitions: Math.max(1, state.repetitions - 1) })
                }>
                <Text style={styles.repsButtonText}>−</Text>
              </Pressable>
              <Text style={styles.repsValue}>{state.repetitions}</Text>
              <Pressable
                style={styles.repsButton}
                onPress={() => updateState(technique.key, { repetitions: state.repetitions + 1 })}>
                <Text style={styles.repsButtonText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.expandedLabel}>Game</Text>
            <Pressable
              style={styles.gameSelector}
              onPress={() => updateState(technique.key, { gamePickerOpen: !state.gamePickerOpen })}>
              <Text style={styles.gameSelectorText}>{state.game || 'Select a game'}</Text>
              <Text style={styles.gameSelectorChevron}>{state.gamePickerOpen ? '▴' : '▾'}</Text>
            </Pressable>
            {state.gamePickerOpen && (
              <View style={styles.gameOptionList}>
                {games.map((game) => (
                  <Pressable
                    key={game}
                    style={styles.gameOption}
                    onPress={() => updateState(technique.key, { game, gamePickerOpen: false })}>
                    <Text style={styles.gameOptionText}>{game}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Assign Homework</Text>
          <View style={styles.studentPill}>
            <View style={styles.studentPillAvatar}>
              <Text style={styles.studentPillAvatarText}>{student.initials}</Text>
            </View>
            <Text style={styles.studentPillText}>{student.name}</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.pillLabel}>
            <Text style={styles.pillLabelText}>FLUENCY SHAPING</Text>
          </View>
          <View style={styles.badgeBlue}>
            <Text style={styles.badgeBlueText}>Prevent stutters</Text>
          </View>
        </View>

        <View style={styles.techniqueList}>{FLUENCY_SHAPING_TECHNIQUES.map(renderTechnique)}</View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.pillLabel}>
            <Text style={styles.pillLabelText}>STUTTERING MODIFICATION</Text>
          </View>
          <View style={styles.badgeAmber}>
            <Text style={styles.badgeAmberText}>Manage in moment</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningCardText}>Recommended for ages 8+ with established self-awareness</Text>
        </View>

        <View style={styles.techniqueList}>{STUTTERING_MODIFICATION_TECHNIQUES.map(renderTechnique)}</View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            {enabledEntries.length} technique{enabledEntries.length === 1 ? '' : 's'} assigned
            {firstEnabled ? ` · ${firstEnabled.repetitions} repetitions · ${firstEnabled.game}` : ''}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.assignButton,
              enabledEntries.length === 0 && styles.assignButtonDisabled,
              pressed && styles.pressed,
            ]}
            disabled={enabledEntries.length === 0}
            onPress={() => {
              Alert.alert('Assigned!', `Homework assigned to ${student.name}.`);
              router.back();
            }}>
            <Text style={styles.assignButtonText}>Assign to {student.name.split(' ')[0]} →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TherapistPalette.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  notFound: {
    fontFamily: BodyFont,
    fontSize: 16,
    color: TherapistPalette.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    backgroundColor: TherapistPalette.iceLight,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  backButtonText: {
    fontFamily: BodyBold,
    fontSize: 14,
    color: TherapistPalette.brandBlue,
  },
  title: {
    fontFamily: TitleFont,
    fontSize: 20,
    color: TherapistPalette.textDark,
  },
  studentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TherapistPalette.brandBlue,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  studentPillAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentPillAvatarText: {
    fontFamily: BodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  studentPillText: {
    fontFamily: BodySemibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },
  pillLabel: {
    alignSelf: 'flex-start',
    backgroundColor: TherapistPalette.pillBackground,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillLabelText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    letterSpacing: 0.5,
  },
  badgeBlue: {
    backgroundColor: `${TherapistPalette.brandBlue}1F`,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeBlueText: {
    fontFamily: BodySemibold,
    fontSize: 11,
    color: TherapistPalette.brandBlue,
  },
  badgeAmber: {
    backgroundColor: `${TherapistPalette.yellow}33`,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeAmberText: {
    fontFamily: BodySemibold,
    fontSize: 11,
    color: '#8A6A10',
  },
  warningCard: {
    backgroundColor: `${TherapistPalette.yellow}22`,
    borderWidth: 1,
    borderColor: TherapistPalette.yellow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  warningCardText: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: '#8A6A10',
  },
  techniqueList: {
    gap: 12,
  },
  techniqueCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 14,
  },
  techniqueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  techniqueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueIconEmoji: {
    fontSize: 20,
  },
  techniqueText: {
    flex: 1,
  },
  techniqueName: {
    fontFamily: BodySemibold,
    fontSize: 16,
    color: TherapistPalette.textDark,
  },
  techniqueDescription: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: TherapistPalette.textMuted,
    marginTop: 2,
  },
  techniqueExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: TherapistPalette.background,
    gap: 8,
  },
  expandedLabel: {
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.textMuted,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  difficultyPillActive: {
    backgroundColor: TherapistPalette.brandBlue,
    borderColor: TherapistPalette.brandBlue,
  },
  difficultyPillText: {
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.textDark,
  },
  difficultyPillTextActive: {
    color: '#FFFFFF',
  },
  repsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  repsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repsButtonText: {
    fontFamily: BodyBold,
    fontSize: 18,
    color: TherapistPalette.brandBlue,
  },
  repsValue: {
    fontFamily: BodyBold,
    fontSize: 16,
    color: TherapistPalette.textDark,
    minWidth: 24,
    textAlign: 'center',
  },
  gameSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  gameSelectorText: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: TherapistPalette.textDark,
  },
  gameSelectorChevron: {
    fontSize: 12,
    color: TherapistPalette.textMuted,
  },
  gameOptionList: {
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gameOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: TherapistPalette.background,
  },
  gameOptionText: {
    fontFamily: BodyFont,
    fontSize: 13,
    color: TherapistPalette.textDark,
  },
  summaryCard: {
    backgroundColor: TherapistPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TherapistPalette.border,
    padding: 18,
    marginTop: 28,
    gap: 14,
  },
  summaryText: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: TherapistPalette.textDark,
    textAlign: 'center',
  },
  assignButton: {
    backgroundColor: TherapistPalette.brandBlue,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    backgroundColor: TherapistPalette.border,
  },
  assignButtonText: {
    fontFamily: TitleFont,
    fontSize: 18,
    color: '#FFFFFF',
  },
});
