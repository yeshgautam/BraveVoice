import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

export function BraveVoiceHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>BraveVoice</Text>
        <Text style={styles.heart}>💜</Text>
      </View>
      <Text style={styles.subtitle}>Your voice matters</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: '#7C4DFF',
  },
  heart: {
    fontSize: 15,
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: '#9C8FD9',
    marginTop: -2,
  },
});
