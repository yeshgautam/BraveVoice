// Screen C router for the new 8+ game set. All 20 games now have real implementations; the
// "Coming soon" screen below is kept only as a safety net for an unknown/mistyped game key.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalloonPopCountUpGame } from '@/components/games/balloon-pop-count-up-game';
import { BattleshipGame } from '@/components/games/battleship-game';
import { BingoGame } from '@/components/games/bingo-game';
import { BowlingGame } from '@/components/games/bowling-game';
import { CheckersGame } from '@/components/games/checkers-game';
import { CheckersLiteGame } from '@/components/games/checkers-lite-game';
import { ChutesAndLaddersGame } from '@/components/games/chutes-and-ladders-game';
import { ColoringRevealGame } from '@/components/games/coloring-reveal-game';
import { Connect4Game } from '@/components/games/connect-4-game';
import { ConnectTheDotsRevealGame } from '@/components/games/connect-the-dots-reveal-game';
import { DartsGame } from '@/components/games/darts-game';
import { DotsAndBoxesGame } from '@/components/games/dots-and-boxes-game';
import { FishingDerbyGame } from '@/components/games/fishing-derby-game';
import { GoFishGame } from '@/components/games/go-fish-game';
import { HangManGame } from '@/components/games/hang-man-game';
import { IglooBuilderGame } from '@/components/games/igloo-builder-game';
import { JigsawRevealGame } from '@/components/games/jigsaw-reveal-game';
import { MazeRunnerGame } from '@/components/games/maze-runner-game';
import { MemoryFindGame } from '@/components/games/memory-find-game';
import { MemoryMatchGame } from '@/components/games/memory-match-game';
import { PenguinRaceGame } from '@/components/games/penguin-race-game';
import { PuzzlePiecesGame } from '@/components/games/puzzle-pieces-game';
import { QuizShowGame } from '@/components/games/quiz-show-game';
import { QuizWheelGame } from '@/components/games/quiz-wheel-game';
import { RockPaperScissorsGame } from '@/components/games/rock-paper-scissors-game';
import { SimonSaysGame } from '@/components/games/simon-says-game';
import { SnakesAndLaddersGame } from '@/components/games/snakes-and-ladders-game';
import { SpotTheDifferenceGame } from '@/components/games/spot-the-difference-game';
import { TicTacToeGame } from '@/components/games/tic-tac-toe-game';
import { TwentyQuestionsGame } from '@/components/games/twenty-questions-game';
import { UnoGame } from '@/components/games/uno-game';
import { TwoLaneRaceGame } from '@/components/games/two-lane-race-game';
import { WavelengthGame } from '@/components/games/wavelength-game';
import { WhackAMoleGame } from '@/components/games/whack-a-mole-game';
import { WordQuestGame } from '@/components/games/word-quest-game';
import { findNewGameEntry } from '@/constants/new-games-catalog';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { FinCharacter } from '@/game-engine/FinCharacter';

const IMPLEMENTED_GAMES: Record<string, () => React.JSX.Element> = {
  'tic-tac-toe': TicTacToeGame,
  'memory-match': MemoryMatchGame,
  'connect-4': Connect4Game,
  'whack-a-mole': WhackAMoleGame,
  'simon-says': SimonSaysGame,
  bingo: BingoGame,
  'igloo-builder': IglooBuilderGame,
  'maze-runner': MazeRunnerGame,
  'balloon-pop-count-up': BalloonPopCountUpGame,
  bowling: BowlingGame,
  'two-lane-race': TwoLaneRaceGame,
  'go-fish': GoFishGame,
  'rock-paper-scissors': RockPaperScissorsGame,
  'connect-the-dots-reveal': ConnectTheDotsRevealGame,
  'jigsaw-reveal': JigsawRevealGame,
  'checkers-lite': CheckersLiteGame,
  'snakes-and-ladders': SnakesAndLaddersGame,
  'fishing-derby': FishingDerbyGame,
  'coloring-reveal': ColoringRevealGame,
  'quiz-show': QuizShowGame,
  'word-quest': WordQuestGame,
  'hang-man': HangManGame,
  darts: DartsGame,
  'quiz-wheel': QuizWheelGame,
  'twenty-questions': TwentyQuestionsGame,
  'spot-the-difference': SpotTheDifferenceGame,
  uno: UnoGame,
  'memory-find': MemoryFindGame,
  checkers: CheckersGame,
  'penguin-race': PenguinRaceGame,
  'puzzle-pieces': PuzzlePiecesGame,
  'dots-and-boxes': DotsAndBoxesGame,
  battleship: BattleshipGame,
  wavelength: WavelengthGame,
  'chutes-and-ladders': ChutesAndLaddersGame,
};

export default function PlayGameScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();

  const GameComponent = key ? IMPLEMENTED_GAMES[key] : undefined;
  if (GameComponent) {
    return <GameComponent />;
  }

  const entry = findNewGameEntry(key ?? '');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <FinCharacter state="encouraging" size={150} />
        <Text style={styles.title}>{entry?.title ?? 'This game'} is coming soon!</Text>
        <Text style={styles.body}>We&apos;re still building this one. Check back soon — more games are ready to play right now.</Text>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 10,
  },
  buttonText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
