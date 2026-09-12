// Phase 7 — parent-facing education page. Not child-facing: reached only from Parent Settings.

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyBold, BodyFont, BodySemibold, ParentPalette, TitleFont } from '@/constants/parent-theme';

const DISFLUENCY_TYPES = [
  {
    key: 'repetitions',
    label: 'Repetitions',
    example: '"p-p-p-pencil" or "my my my pencil"',
    body: 'Repeating a sound, syllable, or whole word one or more times before moving on.',
  },
  {
    key: 'prolongations',
    label: 'Prolongations',
    example: '"mmmmmustard"',
    body: 'Stretching a single sound out longer than usual before the rest of the word comes out.',
  },
  {
    key: 'blocks',
    label: 'Blocks',
    example: 'A silent pause mid-word, like the word is "stuck"',
    body: "Speech and airflow briefly stop entirely — your child may look like they're straining to get the word out.",
  },
];

const DO_NOT_SAY = [
  { phrase: '"Slow down"', why: "It puts attention on HOW they're talking instead of WHAT they're saying, which usually adds more pressure, not less." },
  { phrase: 'Finishing their sentences', why: 'It signals impatience and takes away their chance to work through the moment themselves.' },
];

const WHAT_HELPS = [
  'Patient, unhurried listening — give them all the time they need.',
  "Not rushing or jumping in, even when it's tempting.",
  'Modeling relaxed, easy speech yourself in everyday conversation.',
];

export default function UnderstandingStutteringScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Settings</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Understanding Stuttering</Text>
        <Text style={styles.intro}>
          A quick guide to what you might notice at home, and how to support your child through it.
        </Text>

        <Text style={styles.sectionHeading}>Three types of disfluency</Text>
        {DISFLUENCY_TYPES.map((type) => (
          <View key={type.key} style={styles.card}>
            <Text style={styles.cardLabel}>{type.label}</Text>
            <Text style={styles.cardExample}>{type.example}</Text>
            <Text style={styles.cardBody}>{type.body}</Text>
          </View>
        ))}

        <Text style={styles.sectionHeading}>What not to say</Text>
        <View style={styles.card}>
          {DO_NOT_SAY.map((item, i) => (
            <View key={item.phrase} style={[styles.doNotRow, i === DO_NOT_SAY.length - 1 && styles.doNotRowLast]}>
              <Text style={styles.doNotPhrase}>❌ {item.phrase}</Text>
              <Text style={styles.cardBody}>{item.why}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeading}>What helps</Text>
        <View style={styles.card}>
          {WHAT_HELPS.map((item, i) => (
            <Text key={item} style={[styles.helpItem, i === WHAT_HELPS.length - 1 && styles.helpItemLast]}>
              💙 {item}
            </Text>
          ))}
        </View>

        <View style={styles.reassuranceCard}>
          <Text style={styles.reassuranceText}>
            It&apos;s completely normal for your child to still stutter sometimes during practice — that&apos;s not a
            failure, it&apos;s part of the process. Progress isn&apos;t about eliminating every bump; it&apos;s about
            building confidence and real tools they can reach for.
          </Text>
        </View>

        <Text style={styles.footerNote}>
          If you have concerns about your child&apos;s speech, please stay in touch with their speech-language
          pathologist — they know your child&apos;s specific plan best.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ParentPalette.background,
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontFamily: BodyBold,
    fontSize: 15,
    color: ParentPalette.brandBlue,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  title: {
    fontFamily: TitleFont,
    fontSize: 28,
    color: ParentPalette.textDark,
  },
  intro: {
    fontFamily: BodyFont,
    fontSize: 14,
    color: ParentPalette.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  sectionHeading: {
    fontFamily: BodyBold,
    fontSize: 16,
    color: ParentPalette.textDark,
    marginTop: 26,
    marginBottom: 10,
  },
  card: {
    backgroundColor: ParentPalette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ParentPalette.border,
    padding: 16,
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: BodyBold,
    fontSize: 15,
    color: ParentPalette.brandBlue,
  },
  cardExample: {
    fontFamily: BodySemibold,
    fontSize: 13,
    color: ParentPalette.textDark,
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardBody: {
    fontFamily: BodyFont,
    fontSize: 13,
    color: ParentPalette.textMuted,
    marginTop: 6,
    lineHeight: 19,
  },
  doNotRow: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ParentPalette.background,
  },
  doNotRowLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  doNotPhrase: {
    fontFamily: BodyBold,
    fontSize: 14,
    color: ParentPalette.textDark,
  },
  helpItem: {
    fontFamily: BodyFont,
    fontSize: 13,
    color: ParentPalette.textDark,
    lineHeight: 20,
    marginBottom: 10,
  },
  helpItemLast: {
    marginBottom: 0,
  },
  reassuranceCard: {
    backgroundColor: ParentPalette.iceLight,
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
  },
  reassuranceText: {
    fontFamily: BodySemibold,
    fontSize: 14,
    color: ParentPalette.textDark,
    lineHeight: 21,
  },
  footerNote: {
    fontFamily: BodyFont,
    fontSize: 12,
    color: ParentPalette.textMuted,
    lineHeight: 18,
    marginTop: 18,
    textAlign: 'center',
  },
});
