# BraveVoice

A speech-therapy adventure for children aged 4 to 12. The child walks through a
snowbound castle courtyard in first person, finds five glowing crystals, and
practises a target speech sound at each one.

## Running it on the iPad simulator

You need a Mac with Xcode installed, plus Node 18 or newer. The project uses
Skia, Reanimated worklets, expo-gl and the microphone, so it needs a native
build. **Expo Go will not run it.**

```bash
git checkout claude/youthful-archimedes-hnkio3
npm install
npx expo run:ios
```

`expo run:ios` generates the native project, installs pods and builds. The first
run takes several minutes; later runs reuse the build.

To pick an iPad explicitly, list what you have and name one:

```bash
xcrun simctl list devices available | grep iPad
npx expo run:ios --device "iPad Pro 13-inch (M4)"
```

After the first build, `npx expo start` and pressing `i` relaunches it.

Two things to know once it opens:

- **Type on the simulator with your Mac keyboard** by turning on I/O → Keyboard →
  Connect Hardware Keyboard (Shift-Cmd-K). Without it, W/A/S/D go to macOS and
  the player will not move.
- **The simulator has no microphone**, so speaking rounds run in practice mode
  and still award stars. Use a physical iPad to score a real voice.

If the build fails, the usual causes are CocoaPods missing (`brew install
cocoapods`) or Xcode's command line tools not selected
(`sudo xcode-select -s /Applications/Xcode.app`).

## Controls

| Input | Action |
| --- | --- |
| `W` / `↑` | Walk forward |
| `S` / `↓` | Walk back |
| `A` / `D` | Step sideways |
| `←` `→` or `Q` / `E` | Turn |
| `Shift` | Run |
| `Space`, `Enter` or `F` | Talk to a crystal |
| `M` | Toggle the control hints |
| `Esc` | Close a challenge |

Touch works everywhere a keyboard does: the left thumbstick walks, dragging the
right half of the screen looks around, and the round button opens a challenge.
A Magic Keyboard or any Bluetooth keyboard drives the game directly on iPadOS.

## Layout

```
src/game/      world layout, collision, input, progress store, speech content
src/world3d/   three.js scene: castle, gate, crystal tree, lanterns, stations
src/ui/        HUD, joystick, look pad, speech challenge, keyboard host
src/screens/   SplashScreen (Skia castle gate) and GameScreen
```

## The speaking round

`src/game/useVoiceMeter.ts` records with `expo-audio` metering enabled and turns
the dBFS reading into a 0-1 voicing level. A round is scored on how long the
child sustains voicing above the target and how loud their peak was.

This is a voicing meter, not speech recognition: it rewards a clear, sustained
attempt rather than checking the word was pronounced correctly. Scoring actual
pronunciation needs an on-device or hosted ASR model, which is not wired up.

## Web

`npm run web` also runs, which is handy for quick visual checks. `index.web.ts`
loads the CanvasKit WebAssembly runtime before mounting, and
`scripts/copy-canvaskit.js` copies that binary out of `node_modules` on install.
