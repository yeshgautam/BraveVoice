import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { StutterOkContent } from '@/components/stutter-ok-content';
import { OnboardingPalette } from '@/constants/onboarding-theme';

export default function StutterOkOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={7} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <StutterOkContent />
        </ScrollView>
        <OnboardingActions onContinue={() => router.push('/onboarding/mic-check')} onBack={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
