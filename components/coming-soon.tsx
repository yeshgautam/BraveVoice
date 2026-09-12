import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';

export function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '700',
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 10,
  },
});
