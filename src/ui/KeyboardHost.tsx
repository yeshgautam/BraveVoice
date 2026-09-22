import React, { useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardFocusView, type OnKeyPress } from 'react-native-external-keyboard';

import { keyFor, type LogicalKey } from '../game/input';

export type KeyboardHostProps = {
  onKey: (key: LogicalKey, down: boolean) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
};

/**
 * Hardware-keyboard host. On iOS and iPadOS this is a focusable native view, so
 * a Magic Keyboard or any Bluetooth keyboard drives the game directly.
 */
export function KeyboardHost({ onKey, style, accessibilityLabel, children }: KeyboardHostProps) {
  const down = useCallback(
    (e: OnKeyPress) => {
      const key = keyFor(e.nativeEvent.keyCode, e.nativeEvent.unicodeChar);
      if (key) onKey(key, true);
    },
    [onKey],
  );
  const up = useCallback(
    (e: OnKeyPress) => {
      const key = keyFor(e.nativeEvent.keyCode, e.nativeEvent.unicodeChar);
      if (key) onKey(key, false);
    },
    [onKey],
  );

  return (
    <KeyboardFocusView
      style={style}
      autoFocus
      focusable
      haloEffect={false}
      onKeyDownPress={down}
      onKeyUpPress={up}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </KeyboardFocusView>
  );
}
