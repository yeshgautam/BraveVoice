// Self-Grade Games — a settings tool to go through every game in the app, for BOTH age modes, and
// grade each one (1-3 stars). Grades persist in the app's SQLite key-value store so they survive
// restarts. Reached from parent Settings → "Self-Grade Games". Each row launches the game and holds
// its grade; the header shows overall coverage.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ALL_GAMES_ORDERED } from '@/constants/games-catalog';
import { NEW_GAMES_CATALOG } from '@/constants/new-games-catalog';
import { BodyBold, BodyFont, BodyMedium, BodySemibold, ParentPalette, TitleFont } from '@/constants/parent-theme';
import { getIdentityValue, setIdentityValue } from '@/lib/session-sync/database';

const STORAGE_KEY = 'selfGradeGames';

type GradeRow = { key: string; title: string; playPath: string };

// Classic/board games play through the new Screen C router; young strategy games use their legacy
// gameplay screens. Both are listed so every game can be graded for both age modes.
const CLASSIC_ROWS: GradeRow[] = NEW_GAMES_CATALOG.map((g) => ({
  key: g.key,
  title: g.title,
  playPath: `/(tabs)/games/play/${g.key}`,
}));
const YOUNG_ROWS: GradeRow[] = ALL_GAMES_ORDERED.map((g) => ({
  key: `young:${g.key}`,
  title: g.title,
  playPath: `/(tabs)/games/${g.key}`,
}));
const ALL_ROWS = [...CLASSIC_ROWS, ...YOUNG_ROWS];

function loadGrades(): Record<string, number> {
  try {
    return JSON.parse(getIdentityValue(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function Stars({ value, onSet }: { value: number; onSet: (n: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3].map((n) => (
        <Pressable key={n} hitSlop={6} onPress={() => onSet(value === n ? 0 : n)}>
          <Text style={[styles.star, n <= value ? styles.starOn : styles.starOff]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SelfGradeScreen() {
  const router = useRouter();
  const [grades, setGrades] = useState<Record<string, number>>(loadGrades);

  const setGrade = (key: string, stars: number) => {
    setGrades((prev) => {
      const next = { ...prev, [key]: stars };
      setIdentityValue(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const gradedCount = ALL_ROWS.filter((r) => (grades[r.key] ?? 0) > 0).length;

  const renderRow = (row: GradeRow, isLast: boolean) => (
    <View key={row.key} style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {row.title}
      </Text>
      <View style={styles.rowRight}>
        <Pressable
          style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
          onPress={() => router.push(row.playPath as never)}>
          <Text style={styles.playBtnText}>▶ Play</Text>
        </Pressable>
        <Stars value={grades[row.key] ?? 0} onSet={(n) => setGrade(row.key, n)} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Self-Grade Games</Text>
        <Text style={styles.subtitle}>
          Play each game and grade it 1–3 stars. Covers every game for both age modes — grades save automatically.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            Graded {gradedCount} of {ALL_ROWS.length}
          </Text>
          <View style={styles.summaryTrack}>
            <View style={[styles.summaryFill, { width: `${(gradedCount / ALL_ROWS.length) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>CLASSIC / BOARD GAMES · BOTH AGES</Text>
        </View>
        <View style={styles.listCard}>{CLASSIC_ROWS.map((r, i) => renderRow(r, i === CLASSIC_ROWS.length - 1))}</View>

        <View style={styles.pillLabel}>
          <Text style={styles.pillLabelText}>YOUNG (4–7) STRATEGY GAMES</Text>
        </View>
        <View style={styles.listCard}>{YOUNG_ROWS.map((r, i) => renderRow(r, i === YOUNG_ROWS.length - 1))}</View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ParentPalette.background,
  },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: ParentPalette.card,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    fontFamily: BodyBold,
    fontSize: 13,
    color: ParentPalette.brandBlue,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontFamily: TitleFont,
    fontSize: 30,
    color: ParentPalette.textDark,
  },
  subtitle: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: ParentPalette.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 16,
    marginTop: 16,
    gap: 10,
  },
  summaryText: {
    fontFamily: BodyMedium,
    fontSize: 16,
    color: ParentPalette.textDark,
  },
  summaryTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: ParentPalette.background,
    overflow: 'hidden',
  },
  summaryFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: ParentPalette.brandBlue,
  },
  pillLabel: {
    alignSelf: 'flex-start',
    backgroundColor: ParentPalette.pillBackground,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 26,
    marginBottom: 12,
  },
  pillLabelText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: ParentPalette.textMuted,
    letterSpacing: 0.5,
  },
  listCard: {
    backgroundColor: ParentPalette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: ParentPalette.background,
    gap: 10,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowTitle: {
    flex: 1,
    fontFamily: BodySemibold,
    fontSize: 14,
    color: ParentPalette.textDark,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    backgroundColor: ParentPalette.iceLight,
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  playBtnText: {
    fontFamily: BodyBold,
    fontSize: 12,
    color: ParentPalette.brandBlue,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 22,
  },
  starOn: {
    color: '#F5B942',
  },
  starOff: {
    color: ParentPalette.border,
  },
  pressed: {
    opacity: 0.85,
  },
});
