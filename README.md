# BraveVoice

A speech-therapy adventure for children aged 4 to 12. The child walks through a
snowbound castle courtyard in first person, finds five glowing crystals, and
practises a target speech sound at each one.

## Running it on the iPad simulator

The project needs a native build because it uses Skia, Reanimated worklets,
expo-gl and the microphone. Expo Go will not load it.

```bash
npm install
npx expo run:ios --device "iPad Pro 13-inch (M4)"
```

`xcrun simctl list devices available` lists the simulators installed on your
machine if that name does not match. To pick the device interactively:

```bash
npx expo run:ios
```

The first build compiles the native project and takes several minutes. After
that, `npm start` and pressing `i` reuses it.

The simulator has no microphone input, so speaking rounds fall back to practice
mode and still award stars. Run on a physical iPad to score a real voice.

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
