// 7-strategy switcher, opened from Settings or a game's in-round gear icon. Switching mid-game
// is safe by construction: it only ever writes activeStrategy to context, and every game reads
// that value fresh each round rather than snapshotting it at game start, so round progress
// (round index, scores-so-far, board state) is untouched by a switch — the very next attempt
// just gets judged by the new strategy's scorer.

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { DIFFICULTY_TIERS, STRATEGIES, useStrategy } from '@/contexts/strategy-context';

export function StrategySwitcherModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { activeStrategy, setActiveStrategy, difficultyTier, setDifficultyTier } = useStrategy();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Choose a Strategy</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {STRATEGIES.map((s) => {
              const active = activeStrategy === s.key;
              return (
                <Pressable
                  key={s.key}
                  style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
                  onPress={() => setActiveStrategy(s.key)}>
                  <Text style={styles.cardIcon}>{s.icon}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardLabel}>{s.label}</Text>
                    <Text style={styles.cardDescription}>{s.description}</Text>
                  </View>
                  {active && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}

            <Text style={styles.sectionLabel}>Difficulty</Text>
            <View style={styles.tierRow}>
              {DIFFICULTY_TIERS.map((t) => {
                const active = difficultyTier === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={({ pressed }) => [styles.tierPill, active && styles.tierPillActive, pressed && styles.pressed]}
                    onPress={() => setDifficultyTier(t.key)}>
                    <Text style={[styles.tierPillText, active && styles.tierPillTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Pressable style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,16,28,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#123A57',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '80%',
    borderTopWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.4)',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  list: {
    flexGrow: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15,40,66,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.35)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardActive: {
    backgroundColor: '#2E6B9E',
    borderColor: '#8FD9F7',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardDescription: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: '#BFE3F5',
    marginTop: 2,
  },
  check: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFE9A8',
  },
  sectionLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '800',
    color: '#EAF6FF',
    marginTop: 4,
    marginBottom: 10,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tierPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(15,40,66,0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.35)',
  },
  tierPillActive: {
    backgroundColor: '#2E6B9E',
    borderColor: '#8FD9F7',
  },
  tierPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: '#BFE3F5',
  },
  tierPillTextActive: {
    color: '#FFFFFF',
  },
  closeButton: {
    marginTop: 8,
    backgroundColor: 'rgba(15,40,66,0.9)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.4)',
  },
  closeButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#EAF6FF',
  },
  pressed: {
    opacity: 0.85,
  },
});
