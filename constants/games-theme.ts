// Shared visual identity for every 8+ mode game screen, per the finalized "BraveVoice — 8+
// Mode Games: Visual Design Report". Distinct from OnboardingPalette (onboarding + young mode
// screens) — only game screens (the GameScreen.tsx shell, Tic-Tac-Toe, and every game built on
// top of them) import this. Coloring Reveal is the one spec-documented exception allowed a
// broader/softer palette of its own — it doesn't need to import this file.

export const GamesPalette = {
  background: '#EAF4FC',
  backgroundAlt: '#DCEBFA',
  iceBorder: '#B5D4F4',
  /** Headers, active states, progress — not the mic button. */
  navyAccent: '#0C447C',
  /** The mic button and primary actions, exclusively. */
  amberAccent: '#F0A93B',
  cardWhite: '#FFFFFF',
  title: '#16202B',
  subtitle: '#64748B',
  /** Sparing use only — success states, not a general accent. */
  successGreen: '#3FAE64',
};

// Exact palette sampled from the finalized game-screen design export (the 18 classic/board games:
// Tic-Tac-Toe, Connect 4, UNO, Darts, …). These games share one frame — a slate header with an
// orange underline and a bottom row (round mic + waveform on the left, the Fin penguin standing on
// a navy "• RAINBOW •" word pill on the right). Reproduces the mockups literally; do not tweak.
export const MockupPalette = {
  header: '#4E628E',
  orange: '#E8694A',
  slate: '#4E628E',
  lightBlue: '#D6EAF8',
  navy: '#2B4B8E',
  coral: '#E8694A',
  cream: '#F5F5F0',
  newGamePill: '#B6CCE5',
  pillNavy: '#304062',
  yellow: '#F5C842',
  green: '#A1D2A0',
  penguinBlue: '#699EE5',
  amber: '#F0A93B',
  title: '#16202B',
  subtitle: '#8A93A6',
  pageBg: '#FFFFFF',
};
