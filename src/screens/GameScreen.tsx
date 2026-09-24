import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { FONT, Palette } from '../game/palette';
import { pressKey, releaseAllKeys, releaseKey, resetInput, type LogicalKey } from '../game/input';
import { SOUND_SETS } from '../game/words';
import { STATIONS } from '../game/world';
import { TOTAL_WORDS, useGame } from '../game/store';
import { CastleScene, applySceneDefaults } from '../world3d/CastleScene';
import { Player, type PlayerSnapshot } from '../world3d/Player';
import { ControlHints, InteractPrompt, Minimap, RoundButton, StarCounter, Toast } from '../ui/HUD';
import { Joystick } from '../ui/Joystick';
import { KeyboardHost } from '../ui/KeyboardHost';
import { LookPad } from '../ui/LookPad';
import { SpeechChallenge } from '../ui/SpeechChallenge';

export default function GameScreen({ onExit }: { onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const phase = useGame((s) => s.phase);
  const progress = useGame((s) => s.progress);
  const totalStars = useGame((s) => s.totalStars);
  const activeStationId = useGame((s) => s.activeStationId);
  const toast = useGame((s) => s.toast);
  const muted = useGame((s) => s.muted);
  const openStation = useGame((s) => s.openStation);
  const closeStation = useGame((s) => s.closeStation);
  const awardWord = useGame((s) => s.awardWord);
  const showToast = useGame((s) => s.showToast);
  const clearToast = useGame((s) => s.clearToast);
  const toggleMute = useGame((s) => s.toggleMute);
  const reset = useGame((s) => s.reset);

  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({
    x: 0,
    z: 17.5,
    yaw: Math.PI,
    nearStationId: null,
    speed: 0,
  });
  const [showHints, setShowHints] = useState(true);
  const lastPrompted = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const challengeOpen = phase === 'challenge' && !!activeStationId;
  const complete = phase === 'complete';
  const cleared = Object.values(progress).reduce((n, p) => n + p.cleared, 0);

  /* ---------------------------------------------------------------- */
  /* Keyboard                                                          */
  /* ---------------------------------------------------------------- */

  const handleKey = useCallback(
    (key: LogicalKey, isDown: boolean) => {
      if (!isDown) {
        if (key !== 'interact' && key !== 'escape' && key !== 'map') releaseKey(key);
        return;
      }
      if (key === 'escape') {
        if (challengeOpen) closeStation();
        return;
      }
      if (key === 'map') {
        setShowHints((v) => !v);
        return;
      }
      if (challengeOpen) return;
      pressKey(key);
    },
    [challengeOpen, closeStation],
  );

  useEffect(() => {
    if (challengeOpen) releaseAllKeys();
  }, [challengeOpen]);

  useEffect(() => {
    resetInput();
    return () => {
      resetInput();
      releaseAllKeys();
      Speech.stop();
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Toasts and station greetings                                      */
  /* ---------------------------------------------------------------- */

  const flashToast = useCallback(
    (text: string) => {
      showToast(text);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => clearToast(), 3200);
    },
    [clearToast, showToast],
  );

  useEffect(() => {
    flashToast(
      Platform.OS === 'web'
        ? 'Find the five glowing crystals. Walk with W, A, S, D.'
        : 'Find the five glowing crystals. Use the stick to walk, drag to look.',
    );
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [flashToast]);

  const handleUpdate = useCallback(
    (snap: PlayerSnapshot) => {
      setSnapshot(snap);
      if (snap.nearStationId && snap.nearStationId !== lastPrompted.current) {
        lastPrompted.current = snap.nearStationId;
        const station = STATIONS.find((s) => s.id === snap.nearStationId);
        if (station) {
          const set = SOUND_SETS[station.setIndex];
          const done = (progress[station.id]?.cleared ?? 0) >= set.words.length;
          flashToast(done ? `${set.title} is complete. Nice work!` : `${set.title}: practise the ${set.sound} sound.`);
          Haptics.selectionAsync().catch(() => undefined);
        }
      } else if (!snap.nearStationId) {
        lastPrompted.current = null;
      }
    },
    [flashToast, progress],
  );

  const handleInteract = useCallback(
    (stationId: string) => {
      const station = STATIONS.find((s) => s.id === stationId);
      if (!station) return;
      const set = SOUND_SETS[station.setIndex];
      if ((progress[stationId]?.cleared ?? 0) >= set.words.length) {
        flashToast(`${set.title} is already finished. Try another crystal!`);
        return;
      }
      releaseAllKeys();
      openStation(stationId);
    },
    [flashToast, openStation, progress],
  );

  const handleAward = useCallback(
    (stars: number) => {
      if (!activeStationId) return;
      const station = STATIONS.find((s) => s.id === activeStationId);
      awardWord(activeStationId, stars);
      closeStation();
      if (station) {
        const set = SOUND_SETS[station.setIndex];
        const next = (progress[activeStationId]?.cleared ?? 0) + 1;
        flashToast(
          next >= set.words.length
            ? `${set.title} complete! The crystal is glowing.`
            : `★${stars} earned. ${set.words.length - next} words left here.`,
        );
      }
    },
    [activeStationId, awardWord, closeStation, flashToast, progress],
  );

  const activeWordIndex = activeStationId ? (progress[activeStationId]?.cleared ?? 0) : 0;
  const nearStation = snapshot.nearStationId ? STATIONS.find((s) => s.id === snapshot.nearStationId) : null;
  const nearSet = nearStation ? SOUND_SETS[nearStation.setIndex] : null;
  const nearDone = nearStation ? (progress[nearStation.id]?.cleared ?? 0) >= (nearSet?.words.length ?? 0) : false;

  return (
    <KeyboardHost
      style={styles.root}
      onKey={handleKey}
      accessibilityLabel="BraveVoice castle courtyard. Use the stick to walk and tap Speak at a glowing crystal."
    >
      <Canvas
        style={StyleSheet.absoluteFill}
        shadows
        gl={{ antialias: true }}
        camera={{ fov: 72, near: 0.1, far: 300, position: [0, 1.5, 17.5], rotation: [0, 0, 0] }}
        onCreated={({ gl, scene }) => applySceneDefaults(gl, scene)}
      >
        <CastleScene
          progress={progress}
          highlightId={snapshot.nearStationId}
          snowCount={700}
          reflectivity={0.45}
        />
        <Player
          onUpdate={handleUpdate}
          onInteract={handleInteract}
          active={!challengeOpen && !complete}
          invertLook={false}
        />
      </Canvas>

      {!challengeOpen && !complete && (
        <View style={[styles.lookLayer, { bottom: 0 }]} pointerEvents="box-none">
          <View style={styles.lookHalf} pointerEvents="box-none" />
          <View style={styles.lookHalf}>
            <LookPad />
          </View>
        </View>
      )}

      {/* Top HUD */}
      <View style={[styles.topBar, { top: insets.top + 12 }]} pointerEvents="box-none">
        <Minimap x={snapshot.x} z={snapshot.z} yaw={snapshot.yaw} progress={progress} />
        <View style={styles.topRight} pointerEvents="box-none">
          <StarCounter stars={totalStars} cleared={cleared} total={TOTAL_WORDS} />
          <View style={styles.topButtons} pointerEvents="box-none">
            <RoundButton label={muted ? '🔇' : '🔊'} onPress={toggleMute} accessibilityLabel="Toggle spoken prompts" />
            <RoundButton label="?" onPress={() => setShowHints((v) => !v)} accessibilityLabel="Toggle control hints" />
            <RoundButton label="⌂" onPress={onExit} accessibilityLabel="Back to the castle gate" />
          </View>
        </View>
      </View>

      {showHints && !challengeOpen && (
        <View style={[styles.hintsWrap, { top: insets.top + 150 }]} pointerEvents="none">
          <ControlHints />
        </View>
      )}

      {toast && !challengeOpen && (
        <View style={[styles.toastWrap, { top: insets.top + 12 }]} pointerEvents="none">
          <Toast text={toast} />
        </View>
      )}

      {/* Bottom controls */}
      {!challengeOpen && !complete && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + 26 }]} pointerEvents="box-none">
          <Joystick />
          <View style={styles.actionColumn} pointerEvents="box-none">
            {nearStation && (
              <View style={styles.promptWrap} pointerEvents="none">
                <InteractPrompt label={nearDone ? `${nearSet?.title} ✓` : `Speak at ${nearSet?.title}`} />
              </View>
            )}
            <RoundButton
              label={nearStation ? 'SPEAK' : 'LOOK\nAROUND'}
              tone={nearStation ? 'action' : 'default'}
              accessibilityLabel={nearStation ? 'Start the speaking challenge' : 'No crystal nearby'}
              onPress={() => {
                if (snapshot.nearStationId) handleInteract(snapshot.nearStationId);
                else flashToast('Walk up to a glowing crystal first.');
              }}
            />
          </View>
        </View>
      )}

      {challengeOpen && activeStationId && (
        <SpeechChallenge
          stationId={activeStationId}
          wordIndex={activeWordIndex}
          muted={muted}
          onAward={handleAward}
          onClose={closeStation}
        />
      )}

      {complete && (
        <View style={styles.completeWrap}>
          <View style={styles.completeCard}>
            <Text style={styles.completeTitle}>Every crystal is glowing!</Text>
            <Text style={styles.completeStars}>★ {totalStars}</Text>
            <Text style={styles.completeBody}>
              You practised {TOTAL_WORDS} words across five sounds. The castle is yours, brave voice.
            </Text>
            <View style={styles.completeButtons}>
              <RoundButton label="Again" onPress={reset} accessibilityLabel="Play again" tone="action" />
              <RoundButton label="⌂" onPress={onExit} accessibilityLabel="Back to the gate" />
            </View>
          </View>
        </View>
      )}
    </KeyboardHost>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.skyHorizon },
  lookLayer: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row' },
  lookHalf: { flex: 1 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topRight: { alignItems: 'flex-end', gap: 10 },
  topButtons: { flexDirection: 'row', gap: 8 },
  hintsWrap: { position: 'absolute', left: 16 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingTop: 4 },
  bottomBar: { position: 'absolute', left: 26, right: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  actionColumn: { alignItems: 'center', gap: 12 },
  promptWrap: { alignItems: 'center' },
  completeWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,14,28,0.82)', padding: 24 },
  completeCard: {
    maxWidth: 520,
    padding: 30,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(12,28,52,0.96)',
    borderWidth: 2,
    borderColor: 'rgba(125,249,255,0.6)',
  },
  completeTitle: { fontFamily: FONT, fontSize: 26, color: '#FFFFFF', textAlign: 'center' },
  completeStars: { fontFamily: FONT, fontSize: 44, color: Palette.lanternGold, marginVertical: 10 },
  completeBody: { fontSize: 15, color: 'rgba(200,225,255,0.85)', textAlign: 'center', lineHeight: 22 },
  completeButtons: { flexDirection: 'row', gap: 14, marginTop: 22, alignItems: 'center' },
});
