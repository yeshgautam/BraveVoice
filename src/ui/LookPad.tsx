import React, { useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { addLook } from '../game/input';

/** Right-hand drag area: swiping turns the camera, like a right stick. */
export function LookPad({ sensitivity = 0.0045 }: { sensitivity?: number }) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 1 || Math.abs(g.dy) > 1,
        onPanResponderMove: (_, g) => {
          addLook(-g.vx * sensitivity * 6, -g.vy * sensitivity * 4);
        },
      }),
    [sensitivity],
  );
  return <View style={StyleSheet.absoluteFill} {...responder.panHandlers} pointerEvents="box-only" />;
}
