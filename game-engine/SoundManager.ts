// Central preload-and-play manager for short, shared gameplay SFX. Every game should
// trigger sound through here (usually via the juice system in juice.ts) instead of
// creating its own one-off AudioPlayer, so taps/chimes/tones sound consistent everywhere.
//
// Recording/playback note: expo-av's Audio APIs are removed on this project's Expo SDK
// (54) — this codebase already standardized on expo-audio for playback (see the ui-tap
// player in the old GameScreen), so SoundManager is built on expo-audio too.
//
// Asset gap: the asset library currently only has archery-specific SFX (bow/arrow/target
// sounds). There's no generic "gentle try again" tone yet, so `tryAgain` is intentionally
// left unmapped below — `playSound()` no-ops harmlessly for any key without an asset.
// Don't wire it to the miss/negative sound as a stand-in; that would contradict the
// "never punishing" retry design. Swap in a real neutral/encouraging tone when one exists.

import { AudioPlayer, createAudioPlayer } from 'expo-audio';

export type SoundKey = 'buttonTap' | 'whoosh' | 'success' | 'tryAgain';

const SOUND_SOURCES: Partial<Record<SoundKey, number>> = {
  buttonTap: require('@/assets/sounds/ui-tap.m4a'),
  whoosh: require('@/assets/sounds/arrow-whoosh.m4a'),
  success: require('@/assets/sounds/target-hit-bullseye.m4a'),
};

let players: Partial<Record<SoundKey, AudioPlayer>> | null = null;

function ensureLoaded(): Partial<Record<SoundKey, AudioPlayer>> {
  if (players) return players;
  const loaded: Partial<Record<SoundKey, AudioPlayer>> = {};
  (Object.keys(SOUND_SOURCES) as SoundKey[]).forEach((key) => {
    const source = SOUND_SOURCES[key];
    if (source === undefined) return;
    loaded[key] = createAudioPlayer(source);
  });
  players = loaded;
  return players;
}

/** Preloads every registered sound so the first playback has no decode/load latency. */
export function preloadSounds(): void {
  ensureLoaded();
}

/** Plays a sound from the start. Silently no-ops if that key has no asset registered. */
export function playSound(key: SoundKey): void {
  const player = ensureLoaded()[key];
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // Sound is a nice-to-have; never let a playback glitch break gameplay.
  }
}

/** Releases all preloaded players. Games don't need this; it's here for app-level teardown. */
export function unloadSounds(): void {
  if (!players) return;
  Object.values(players).forEach((player) => player?.remove());
  players = null;
}
