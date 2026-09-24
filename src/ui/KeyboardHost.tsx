import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { LogicalKey } from '../game/input';

export type KeyboardHostProps = {
  onKey: (key: LogicalKey, down: boolean) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
};

/**
 * Native builds drive the game from the on-screen stick and look pad.
 *
 * Reading a physical keyboard on iOS needs UIResponder key events, which no
 * current community package compiles against React Native 0.86 with the new
 * architecture. Rather than block the build on that, this is a plain container
 * and the web build handles hardware keys in KeyboardHost.web.tsx.
 */
export function KeyboardHost({ style, accessibilityLabel, children }: KeyboardHostProps) {
  return (
    <View style={style} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}
