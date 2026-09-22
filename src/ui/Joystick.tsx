import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { setStick } from '../game/input';

const SIZE = 132;
const KNOB = 56;
const MAX = (SIZE - KNOB) / 2;

/** Left-thumb movement stick. Writes straight into the shared input snapshot. */
export function Joystick({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  const apply = useCallback(
    (dx: number, dy: number) => {
      const dist = Math.hypot(dx, dy);
      const clamped = dist > MAX ? MAX / dist : 1;
      const kx = dx * clamped;
      const ky = dy * clamped;
      setKnob({ x: kx, y: ky });
      const dead = 0.14;
      const nx = kx / MAX;
      const ny = ky / MAX;
      const mag = Math.hypot(nx, ny);
      if (mag < dead) {
        setStick(0, 0);
      } else {
        const scaled = (mag - dead) / (1 - dead);
        setStick((-ny / mag) * scaled, (nx / mag) * scaled);
      }
    },
    [],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          active.current = true;
          onActiveChange?.(true);
        },
        onPanResponderMove: (_, g) => apply(g.dx, g.dy),
        onPanResponderRelease: () => {
          active.current = false;
          onActiveChange?.(false);
          setKnob({ x: 0, y: 0 });
          setStick(0, 0);
        },
        onPanResponderTerminate: () => {
          active.current = false;
          onActiveChange?.(false);
          setKnob({ x: 0, y: 0 });
          setStick(0, 0);
        },
      }),
    [apply, onActiveChange],
  );

  return (
    <View style={styles.wrap} {...responder.panHandlers}>
      <View style={styles.ring}>
        <View style={styles.crossH} />
        <View style={styles.crossV} />
      </View>
      <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(160,210,255,0.45)',
    backgroundColor: 'rgba(10,25,48,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossH: { position: 'absolute', width: SIZE * 0.5, height: 1, backgroundColor: 'rgba(160,210,255,0.25)' },
  crossV: { position: 'absolute', height: SIZE * 0.5, width: 1, backgroundColor: 'rgba(160,210,255,0.25)' },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: 'rgba(120,200,255,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(220,245,255,0.9)',
  },
});
