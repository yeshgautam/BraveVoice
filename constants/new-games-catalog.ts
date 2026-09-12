// The 8+ mode game catalog — replaces the old sports-renamed set (Arctic Archery, Ice Pool,
// etc.) entirely. Flat list, not grouped by category, since every game here works with
// whichever of the 5 strategies is currently active rather than being locked to one.
//
// PLACEHOLDER ICONS: the `icon` field on every entry below is the placeholder-icon slot
// referenced in the report — a single emoji per game. Swap real badge art in by changing
// this file alone (e.g. to a `badgeSource: number` from `require(...)`) once real art lands;
// nothing else needs to change since Screens A and B both read icon straight from here.
//
// `hasGameplay` marks whether a game has a real, playable implementation. All 20 now do; the
// flag stays on each entry as forward-looking metadata (e.g. for a future "new" badge) and the
// Screen C router keeps a "Coming soon" fallback only for an unknown/mistyped game key.

export type NewGameEntry = {
  key: string;
  title: string;
  description: string; // one-line, shown on the list (Screen A)
  howToPlay: string; // 2-3 sentence kid-friendly mechanic explanation (Screen B)
  icon: string; // placeholder emoji — swap for real badge art later
  hasGameplay: boolean;
};

export const NEW_GAMES_CATALOG: NewGameEntry[] = [
  {
    key: 'tic-tac-toe',
    title: 'Tic-Tac-Toe',
    description: 'Claim squares by speaking to win three in a row.',
    howToPlay: "Say the word to place your mark on the board. Get three in a row to win! Play against Fin or pass the device to a friend.",
    icon: '⭕',
    hasGameplay: true,
  },
  {
    key: 'memory-match',
    title: 'Memory Match',
    description: 'Flip icy cards and find every matching pair.',
    howToPlay: 'Say the word to flip a card over. Find the two matching cards before you run out of tries to clear the board!',
    icon: '🃏',
    hasGameplay: true,
  },
  {
    key: 'connect-4',
    title: 'Connect 4',
    description: 'Drop pieces by speaking and connect four in a row.',
    howToPlay: 'Say the word to drop your piece into a column. Be the first to connect four in a row — up, across, or on a slant!',
    icon: '🔵',
    hasGameplay: true,
  },
  {
    key: 'whack-a-mole',
    title: 'Whack-a-Mole',
    description: 'Say the word to boop Fin before he ducks away.',
    howToPlay: "Say the word to boop Fin as soon as he pops up. Quick, clear words earn the most boops!",
    icon: '🔨',
    hasGameplay: true,
  },
  {
    key: 'simon-says',
    title: 'Simon Says',
    description: 'Watch the pattern, then say it back in order.',
    howToPlay: 'Watch the lights light up in a pattern, then say each word back in the same order to repeat it.',
    icon: '🎵',
    hasGameplay: true,
  },
  {
    key: 'bingo',
    title: 'Bingo',
    description: 'Say the word to dab it and race for a full line.',
    howToPlay: 'Say the word to dab it on your card. Get a full line — across, down, or diagonal — to call Bingo!',
    icon: '🎯',
    hasGameplay: true,
  },
  {
    key: 'igloo-builder',
    title: 'Igloo Builder',
    description: "Help Fin build an igloo, one word at a time.",
    howToPlay: "Say each word to add a brick to Fin's igloo. Finish building before you run out of tries!",
    icon: '🧊',
    hasGameplay: true,
  },
  {
    key: 'maze-runner',
    title: 'Maze Runner',
    description: 'Guide Fin through the maze with every word.',
    howToPlay: 'Say the word to help Fin waddle one step through the maze. Reach the end to win!',
    icon: '🧩',
    hasGameplay: true,
  },
  {
    key: 'balloon-pop-count-up',
    title: 'Balloon Pop Count-Up',
    description: 'Pop balloons and watch your count climb.',
    howToPlay: 'Say the word to pop a balloon. Watch your counter climb higher with every pop!',
    icon: '🎈',
    hasGameplay: true,
  },
  {
    key: 'bowling',
    title: 'Bowling',
    description: 'Speak to roll the ball down the lane.',
    howToPlay: 'Say the word to roll the ball down the lane. Knock down all the pins for a strike!',
    icon: '🎳',
    hasGameplay: true,
  },
  {
    key: 'two-lane-race',
    title: 'Two-Lane Race',
    description: 'Boost your racer forward with every word.',
    howToPlay: 'Say the word to give your racer a boost forward. Race Fin or a friend to the finish line!',
    icon: '🏁',
    hasGameplay: true,
  },
  {
    key: 'go-fish',
    title: 'Go Fish',
    description: 'Ask for cards out loud and collect pairs.',
    howToPlay: 'Say the word to ask for a matching card. Collect the most pairs to win the round!',
    icon: '🐟',
    hasGameplay: true,
  },
  {
    key: 'rock-paper-scissors',
    title: 'Rock Paper Scissors',
    description: 'Say your choice out loud to reveal your hand.',
    howToPlay: 'Say "rock," "paper," or "scissors" out loud to reveal your hand. Best out of three wins!',
    icon: '✂️',
    hasGameplay: true,
  },
  {
    key: 'connect-the-dots-reveal',
    title: 'Connect-the-Dots Reveal',
    description: 'Say each word to connect the next dot.',
    howToPlay: 'Say each word to connect the next dot. Finish the picture to see a surprise of Fin!',
    icon: '✏️',
    hasGameplay: true,
  },
  {
    key: 'jigsaw-reveal',
    title: 'Jigsaw Reveal',
    description: 'Snap puzzle pieces into place, word by word.',
    howToPlay: 'Say each word to snap a puzzle piece into place. Complete the picture to reveal an arctic scene!',
    icon: '🧩',
    hasGameplay: true,
  },
  {
    key: 'checkers-lite',
    title: 'Checkers-lite',
    description: 'Say the word to make your next move.',
    howToPlay: 'Say the word to make your move on the board. Capture pieces to win the game!',
    icon: '⚫',
    hasGameplay: true,
  },
  {
    key: 'snakes-and-ladders',
    title: 'Snakes & Ladders',
    description: 'Say the word to roll and move along the path.',
    howToPlay: 'Say the word to roll and move your token along the path. Reach the end first to win!',
    icon: '🎲',
    hasGameplay: true,
  },
  {
    key: 'fishing-derby',
    title: 'Fishing Derby',
    description: 'Cast your line and reel in a catch.',
    howToPlay: 'Say the word to cast your line. A great word reels in a fish — watch your tally grow!',
    icon: '🎣',
    hasGameplay: true,
  },
  {
    key: 'coloring-reveal',
    title: 'Coloring Reveal',
    description: 'Fill in the picture with color, word by word.',
    howToPlay: 'Say each word to fill in one part of the picture with color. Finish to reveal the full scene!',
    icon: '🎨',
    hasGameplay: true,
  },
  {
    key: 'quiz-show',
    title: 'Quiz Show',
    description: 'Buzz in and answer questions out loud.',
    howToPlay: "Say your answer out loud to buzz in. Answer questions correctly to light up the scoreboard!",
    icon: '🎙️',
    hasGameplay: true,
  },
  {
    key: 'word-quest',
    title: 'Word Quest',
    description: 'Reveal a secret word one letter at a time.',
    howToPlay: 'Say each word to uncover the next letter of the secret word. Spell the whole thing to win!',
    icon: '🔤',
    hasGameplay: true,
  },
  {
    key: 'hang-man',
    title: 'Hang Man',
    description: 'Fill in the blanks and build your snow-pal.',
    howToPlay: 'Say each word to reveal a letter and add a piece to your snow-pal. Solve the word to finish!',
    icon: '🎩',
    hasGameplay: true,
  },
  {
    key: 'darts',
    title: 'Darts',
    description: 'Throw darts at the bullseye by speaking.',
    howToPlay: 'Say the word to throw a dart. A clear word lands near the bullseye and scores big!',
    icon: '🎯',
    hasGameplay: true,
  },
  {
    key: 'quiz-wheel',
    title: 'Quiz Wheel',
    description: 'Spin the wheel and answer out loud.',
    howToPlay: 'Say your answer to spin the wheel and bank points. Sweep all five questions for the high score!',
    icon: '🎡',
    hasGameplay: true,
  },
  {
    key: 'twenty-questions',
    title: '20 Questions',
    description: 'Ask yes/no clues to unmask a mystery.',
    howToPlay: 'Say each word to ask the next clue. Reveal all the clues to guess the mystery animal!',
    icon: '❓',
    hasGameplay: true,
  },
  {
    key: 'spot-the-difference',
    title: 'Spot the Difference',
    description: 'Find what changed between two scenes.',
    howToPlay: 'Say the word to circle the next difference between the two arctic scenes. Find them all to win!',
    icon: '🔍',
    hasGameplay: true,
  },
  {
    key: 'uno',
    title: 'UNO',
    description: 'Match colors and numbers to empty your hand.',
    howToPlay: 'Tap a card that matches the color or number, say the word to play it, and be first to run out of cards!',
    icon: '🃏',
    hasGameplay: true,
  },
  {
    key: 'memory-find',
    title: 'Memory Find',
    description: 'Flip cards two at a time to find the pairs.',
    howToPlay: 'Say the word to flip a card. Find two that match to score RED — a mismatch adds to BLACK and flips them back.',
    icon: '🧠',
    hasGameplay: true,
  },
  {
    key: 'checkers',
    title: 'Checkers',
    description: 'Jump and capture Fin’s pieces on the 8x8 board.',
    howToPlay: 'Tap your piece, tap where to move, and say the word to go. Jump over Fin’s pieces to capture them!',
    icon: '⚪',
    hasGameplay: true,
  },
  {
    key: 'penguin-race',
    title: 'Penguin Race',
    description: 'Boost your penguin down the lane to the finish.',
    howToPlay: 'Say the word to boost your penguin one step forward. First racer to reach 7 wins the race!',
    icon: '🐧',
    hasGameplay: true,
  },
  {
    key: 'puzzle-pieces',
    title: 'Puzzle Pieces',
    description: 'Snap the picture together, piece by piece.',
    howToPlay: 'Say the word to place the next batch of puzzle pieces. Complete the whole picture to win!',
    icon: '🧩',
    hasGameplay: true,
  },
  {
    key: 'dots-and-boxes',
    title: 'Dots & Boxes',
    description: 'Draw lines and close boxes to score.',
    howToPlay: 'Say the word to draw a line. Complete a box to claim it for RED and go again — beat Fin (BLACK)!',
    icon: '⬜',
    hasGameplay: true,
  },
  {
    key: 'battleship',
    title: 'Battleship',
    description: 'Fire on the grid to sink Fin’s fleet.',
    howToPlay: 'Tap an enemy square to aim, then say the word to fire. Sink all of Fin’s ships to win!',
    icon: '🚢',
    hasGameplay: true,
  },
  {
    key: 'wavelength',
    title: 'Wavelength',
    description: 'Slide the dial to match the secret word.',
    howToPlay: 'Use the arrows to move the dial toward where the word falls on Cold–Hot, then say the word to lock in!',
    icon: '🎚️',
    hasGameplay: true,
  },
  {
    key: 'chutes-and-ladders',
    title: 'Chutes & Ladders',
    description: 'Spin and climb your way to the top.',
    howToPlay: 'Say the word to spin and move along the board. Ladders lift you up and chutes slide you down!',
    icon: '🎲',
    hasGameplay: true,
  },
];

export function findNewGameEntry(key: string): NewGameEntry | undefined {
  return NEW_GAMES_CATALOG.find((g) => g.key === key);
}
