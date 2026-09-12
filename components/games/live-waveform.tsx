// Real-time amplitude waveform shared by every recording screen — GameScreen, tic-tac-toe,
// pulse-word-game (young mode), and the diagnostic assessment all render the same bars off the
// same `liveWaveform` ring buffer useVoiceRecorder produces, so "the mic is working" looks and
// feels consistent everywhere in the app.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { WAVEFORM_BAR_COUNT } from '@/game-engine/audioRecordingConfig';

function WaveformBar({ index, levels, color, maxHeight }: { index: number; levels: SharedValue<number[]>; color: string; maxHeight: number }) {
  const style = useAnimatedStyle(() => {
    const level = levels.value[index] ?? 0;
    return { height: 4 + level * (maxHeight - 4) };
  });
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

export function LiveWaveform({
  levels,
  color = '#2E86DE',
  height = 44,
}: {
  levels: SharedValue<number[]>;
  color?: string;
  height?: number;
}) {
  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => (
        <WaveformBar key={i} index={i} levels={levels} color={color} maxHeight={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    width: 5,
    borderRadius: 2.5,
  },
});
