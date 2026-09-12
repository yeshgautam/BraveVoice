// Shown after every round instead of a numeric score — a real clinical self-rating tool
// (a 4-point fluency self-perception scale) reframed as Fin's little sailboat. The rating is
// stored for therapist/parent review only (see fluency-rating-context.tsx) and is never
// surfaced to the child as a score anywhere else in the app.

import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/theme';
import { FluencyRating, FLUENCY_RATING_LABEL } from '@/contexts/fluency-rating-context';

const OPTIONS: { key: FluencyRating; emoji: string; roughness: number }[] = [
  { key: 'veryRough', emoji: '🌊', roughness: 3 },
  { key: 'bumpy', emoji: '💧', roughness: 2 },
  { key: 'prettySmooth', emoji: '🌤️', roughness: 1 },
  { key: 'smoothSailing', emoji: '☀️', roughness: 0 },
];

function WaterCanvas({ roughness, width, height }: { roughness: number; width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [t]);

  const roughSV = useSharedValue(roughness);
  useEffect(() => {
    roughSV.value = withTiming(roughness, { duration: 400 });
  }, [roughness, roughSV]);

  const path = useDerivedValue(() => {
    const amplitude = 4 + roughSV.value * 7;
    const frequency = roughSV.value >= 2.5 ? 0.055 : roughSV.value >= 1.5 ? 0.04 : 0.03;
    const jag = roughSV.value >= 2.5 ? 1 : 0; // sharper, less-smooth peaks for very rough water
    const p = Skia.Path.Make();
    const midY = height * 0.55;
    p.moveTo(0, height);
    p.lineTo(0, midY);
    const step = jag ? 10 : 6;
    for (let x = 0; x <= width; x += step) {
      const phase = x * frequency + t.value * Math.PI * 2;
      const y = midY + Math.sin(phase) * amplitude + Math.sin(phase * 2.3) * amplitude * 0.25;
      p.lineTo(x, y);
    }
    p.lineTo(width, height);
    p.close();
    return p;
  });

  return (
    <Canvas style={{ width, height }}>
      <Path path={path} color="#4FA8D8" opacity={0.9} />
      <Path path={path} color="#8FD9F7" opacity={0.35} style="stroke" strokeWidth={2} />
    </Canvas>
  );
}

function Boat({ roughness }: { roughness: number }) {
  const rock = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    const magnitude = 3 + roughness * 9;
    rock.value = withRepeat(
      withSequence(
        withTiming(magnitude, { duration: 420 - roughness * 40, easing: Easing.inOut(Easing.sin) }),
        withTiming(-magnitude, { duration: 420 - roughness * 40, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(2 + roughness * 4, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-(2 + roughness * 4), { duration: 500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [roughness, rock, bob]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotate: `${rock.value}deg` }],
  }));

  return (
    <Animated.Text style={[styles.boat, style]}>⛵</Animated.Text>
  );
}

export function SmoothSailingSlider({ onSelect }: { onSelect: (rating: FluencyRating) => void }) {
  const [selected, setSelected] = useState<FluencyRating | null>(null);
  const { width } = useWindowDimensions();
  const canvasWidth = Math.min(width - 48, 400);
  const canvasHeight = 140;

  const previewRoughness = OPTIONS.find((o) => o.key === selected)?.roughness ?? 1.5;

  const handleSelect = (rating: FluencyRating) => {
    setSelected(rating);
    setTimeout(() => onSelect(rating), 750);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How did that feel?</Text>
      <Text style={styles.subtitle}>Tap where Fin&rsquo;s boat matches your speech</Text>

      <View style={[styles.waterWrap, { width: canvasWidth, height: canvasHeight }]}>
        <WaterCanvas roughness={previewRoughness} width={canvasWidth} height={canvasHeight} />
        <View style={styles.boatWrap} pointerEvents="none">
          <Boat roughness={previewRoughness} />
        </View>
        {previewRoughness < 0.5 && <Text style={styles.sun}>☀️</Text>}
      </View>

      <View style={styles.optionsRow}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={({ pressed }) => [styles.option, selected === opt.key && styles.optionActive, pressed && styles.pressed]}
            onPress={() => handleSelect(opt.key)}>
            <Text style={styles.optionEmoji}>{opt.emoji}</Text>
            <Text style={styles.optionLabel}>{FLUENCY_RATING_LABEL[opt.key]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    color: '#123A57',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '600',
    color: '#5B7A93',
    textAlign: 'center',
    marginBottom: 12,
  },
  waterWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0E2A3E',
    justifyContent: 'flex-end',
  },
  boatWrap: {
    position: 'absolute',
    left: '50%',
    top: '38%',
    marginLeft: -18,
  },
  boat: {
    fontSize: 34,
  },
  sun: {
    position: 'absolute',
    top: 10,
    right: 16,
    fontSize: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  option: {
    width: 150,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F7FC',
    borderWidth: 2,
    borderColor: '#D3E6F2',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  optionActive: {
    borderColor: '#3E86C4',
    backgroundColor: '#E1F0FA',
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: '#123A57',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
