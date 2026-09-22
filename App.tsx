import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FredokaOne_400Regular, useFonts } from '@expo-google-fonts/fredoka-one';
import * as Speech from 'expo-speech';

import SplashScreen from './src/screens/SplashScreen';
import GameScreen from './src/screens/GameScreen';
import { useGame } from './src/game/store';
import { FONT, Palette } from './src/game/palette';

export default function App() {
  const [fontsLoaded] = useFonts({ FredokaOne_400Regular });
  const phase = useGame((s) => s.phase);
  const start = useGame((s) => s.start);
  const reset = useGame((s) => s.reset);

  const handleEnter = useCallback(() => {
    start();
  }, [start]);

  const handleExit = useCallback(() => {
    Speech.stop();
    useGame.setState({ phase: 'splash', activeStationId: null, toast: null });
  }, []);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <StatusBar hidden />
        <Text style={styles.loadingText}>BraveVoice</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <View style={styles.root}>
        {phase === 'splash' ? (
          <SplashScreen onEnter={handleEnter} />
        ) : (
          <GameScreen onExit={handleExit} key={phase === 'playing' ? 'game' : 'game'} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.facade },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.facade },
  loadingText: { color: '#FFFFFF', fontSize: 28, letterSpacing: 2 },
});
