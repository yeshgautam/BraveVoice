import { FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { CheckInProvider } from '@/contexts/check-in-context';
import { DiagnosticProvider } from '@/contexts/diagnostic-context';
import { FluencyRatingProvider } from '@/contexts/fluency-rating-context';
import { HomeworkProvider } from '@/contexts/homework-context';
import { MicCalibrationProvider } from '@/contexts/mic-calibration-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { ProgressProvider } from '@/contexts/progress-context';
import { RewardsProvider } from '@/contexts/rewards-context';
import { StrategyProvider } from '@/contexts/strategy-context';
import { TabThemeProvider } from '@/contexts/tab-theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startMonitoring, syncIfPossible } from '@/lib/session-sync/sync-service';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    FredokaOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Start WiFi monitoring for background session sync. Homework is fetched by
    // HomeworkProvider on launch.
    startMonitoring();
    syncIfPossible();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncIfPossible();
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <OnboardingProvider>
        <ProgressProvider>
          <RewardsProvider>
            <HomeworkProvider>
              <TabThemeProvider>
                <StrategyProvider>
                  <FluencyRatingProvider>
                    <CheckInProvider>
                      <DiagnosticProvider>
                        <MicCalibrationProvider>
                          <Stack>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                            <Stack.Screen name="therapist" options={{ headerShown: false }} />
                            <Stack.Screen name="parent" options={{ headerShown: false }} />
                            <Stack.Screen name="stutter-ok" options={{ headerShown: false }} />
                          </Stack>
                        </MicCalibrationProvider>
                      </DiagnosticProvider>
                    </CheckInProvider>
                  </FluencyRatingProvider>
                </StrategyProvider>
              </TabThemeProvider>
            </HomeworkProvider>
          </RewardsProvider>
        </ProgressProvider>
      </OnboardingProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
