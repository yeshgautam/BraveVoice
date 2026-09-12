// Generic per-game sound bank: preloads a fixed set of local SFX once and exposes a
// `play(key)` trigger. Distinct from SoundManager (which owns the small set of truly
// generic, cross-game cues like buttonTap/whoosh/success) — this is for a single game's
// own bespoke sound moments, e.g. a specific draw-tension or impact cue.

import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

export function useLocalSounds<K extends string>(sources: Record<K, number>) {
  const playersRef = useRef<Record<K, AudioPlayer> | null>(null);
  if (playersRef.current === null) {
    const built = {} as Record<K, AudioPlayer>;
    (Object.keys(sources) as K[]).forEach((key) => {
      built[key] = createAudioPlayer(sources[key]);
    });
    playersRef.current = built;
  }

  useEffect(() => {
    const players = playersRef.current;
    return () => {
      if (players) Object.values(players).forEach((player) => (player as AudioPlayer).remove());
    };
  }, []);

  const play = (key: K) => {
    const player = playersRef.current?.[key];
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Sound is a nice-to-have; never let a playback glitch break gameplay.
    }
  };

  return { play };
}
