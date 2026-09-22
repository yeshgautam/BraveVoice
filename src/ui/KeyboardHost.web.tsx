import React, { useEffect } from 'react';
import { View } from 'react-native';

import { keyForWeb } from '../game/input';
import type { KeyboardHostProps } from './KeyboardHost';

/** Web build: the same controls, wired to DOM key events. */
export function KeyboardHost({ onKey, style, accessibilityLabel, children }: KeyboardHostProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = keyForWeb(e.key, e.code);
      if (!key) return;
      if (!e.repeat) onKey(key, true);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const key = keyForWeb(e.key, e.code);
      if (key) onKey(key, false);
    };
    const blur = () => onKey('escape', false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [onKey]);

  return (
    <View style={style} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}
