import React, { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon } from 'react-native-svg';

import { FONT, Palette } from '../game/palette';
import { PLAZA_RADIUS, STATIONS, TREES } from '../game/world';
import { SOUND_SETS } from '../game/words';
import type { StationProgress } from '../game/store';

const MAP_SIZE = 116;

export const Minimap = memo(function Minimap({
  x,
  z,
  yaw,
  progress,
}: {
  x: number;
  z: number;
  yaw: number;
  progress: Record<string, StationProgress>;
}) {
  const half = MAP_SIZE / 2;
  const scale = half / (PLAZA_RADIUS + 3);
  const px = half + x * scale;
  const pz = half + z * scale;
  return (
    <View style={styles.minimap}>
      <Svg width={MAP_SIZE} height={MAP_SIZE}>
        <Circle cx={half} cy={half} r={half - 2} fill="rgba(8,20,38,0.72)" stroke="rgba(160,210,255,0.5)" strokeWidth={1.5} />
        <Circle cx={half} cy={half} r={PLAZA_RADIUS * scale} fill="rgba(184,200,216,0.12)" />
        {TREES.filter((t) => Math.hypot(t.x, t.z) < PLAZA_RADIUS + 6).map((t, i) => (
          <Circle key={i} cx={half + t.x * scale} cy={half + t.z * scale} r={1.4} fill="rgba(45,90,61,0.9)" />
        ))}
        <Circle cx={half} cy={half} r={3.4} fill={Palette.crystalCore} />
        {STATIONS.map((s) => {
          const done = (progress[s.id]?.cleared ?? 0) >= SOUND_SETS[s.setIndex].words.length;
          return (
            <Circle
              key={s.id}
              cx={half + s.x * scale}
              cy={half + s.z * scale}
              r={3.6}
              fill={done ? Palette.lanternGold : Palette.crystalBlue}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={0.8}
            />
          );
        })}
        <Line
          x1={half - 10 * scale}
          y1={half + 20 * scale}
          x2={half - 2.6 * scale}
          y2={half + 20 * scale}
          stroke={Palette.woodHighlight}
          strokeWidth={2.4}
        />
        <Line
          x1={half + 2.6 * scale}
          y1={half + 20 * scale}
          x2={half + 10 * scale}
          y2={half + 20 * scale}
          stroke={Palette.woodHighlight}
          strokeWidth={2.4}
        />
        <G rotation={(-yaw * 180) / Math.PI} origin={`${px}, ${pz}`}>
          <Polygon points={`${px},${pz - 6} ${px - 4},${pz + 4} ${px + 4},${pz + 4}`} fill="#FFFFFF" />
        </G>
      </Svg>
    </View>
  );
});

export function StarCounter({ stars, cleared, total }: { stars: number; cleared: number; total: number }) {
  return (
    <View style={styles.counter}>
      <Text style={styles.counterStars}>★ {stars}</Text>
      <Text style={styles.counterWords}>
        {cleared}/{total} words
      </Text>
    </View>
  );
}

export function InteractPrompt({ label }: { label: string }) {
  return (
    <View style={styles.prompt} pointerEvents="none">
      <Text style={styles.promptText}>{label}</Text>
      <Text style={styles.promptHint}>{Platform.OS === 'web' ? 'Press Space, or tap SPEAK' : 'Tap SPEAK'}</Text>
    </View>
  );
}

/** Hardware keys exist on web; on a tablet the stick and pad are the controls. */
const HINTS: Array<[string, string]> =
  Platform.OS === 'web'
    ? [
        ['W', 'walk forward'],
        ['S', 'walk back'],
        ['A / D', 'step sideways'],
        ['← →', 'turn'],
        ['Shift', 'run'],
        ['Space', 'talk to a crystal'],
      ]
    : [
        ['Stick', 'walk and step sideways'],
        ['Drag', 'look around'],
        ['SPEAK', 'talk to a crystal'],
      ];

export function ControlHints() {
  return (
    <View style={styles.hints} pointerEvents="none">
      {HINTS.map(([k, v]) => (
        <View key={k} style={styles.hintRow}>
          <Text style={styles.hintKey}>{k}</Text>
          <Text style={styles.hintText}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export function RoundButton({
  label,
  onPress,
  accessibilityLabel,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'default' | 'action';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.roundButton,
        tone === 'action' && styles.roundButtonAction,
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Text style={styles.roundButtonText}>{label}</Text>
    </Pressable>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  minimap: { width: MAP_SIZE, height: MAP_SIZE, borderRadius: MAP_SIZE / 2, overflow: 'hidden' },
  counter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(8,20,38,0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(160,210,255,0.45)',
    alignItems: 'center',
  },
  counterStars: { fontFamily: FONT, fontSize: 20, color: Palette.lanternGold },
  counterWords: { fontSize: 11, color: 'rgba(200,225,255,0.8)', marginTop: 1 },
  prompt: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(0,60,110,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(125,249,255,0.7)',
    alignItems: 'center',
  },
  promptText: { fontFamily: FONT, fontSize: 17, color: '#FFFFFF' },
  promptHint: { fontSize: 11, color: 'rgba(200,235,255,0.8)', marginTop: 2 },
  hints: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(8,20,38,0.55)',
    gap: 3,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintKey: {
    fontFamily: FONT,
    fontSize: 11,
    color: '#FFFFFF',
    minWidth: 54,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  hintText: { fontSize: 11, color: 'rgba(200,225,255,0.75)' },
  roundButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,20,38,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(160,210,255,0.45)',
  },
  roundButtonAction: { backgroundColor: 'rgba(0,140,220,0.8)', borderColor: 'rgba(160,230,255,0.9)', width: 92, height: 92, borderRadius: 46 },
  roundButtonText: { fontFamily: FONT, fontSize: 14, color: '#FFFFFF', textAlign: 'center' },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(8,20,38,0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,208,128,0.7)',
    maxWidth: 420,
  },
  toastText: { fontFamily: FONT, fontSize: 15, color: '#FFFFFF', textAlign: 'center' },
});
