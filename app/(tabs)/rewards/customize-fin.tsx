import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FIN_ITEMS, FIN_ITEM_CATEGORIES, FIN_ITEM_CATEGORY_LABELS, FinItem, FinItemCategory } from '@/content/finItems';
import { useRewardsState } from '@/contexts/rewards-context';
import { FinCharacter } from '@/game-engine/FinCharacter';

const PALETTE = {
  background: '#EEF6FB',
  card: '#FFFFFF',
  brandBlue: '#1A6FA8',
  yellow: '#F5C842',
  textDark: '#1A2A3A',
  textMuted: '#7A9AB0',
  border: '#C8DFF0',
};

const TITLE_FONT = 'FredokaOne_400Regular';
const BODY_FONT = 'Nunito_400Regular';
const BODY_BOLD = 'Nunito_700Bold';
const BODY_EXTRABOLD = 'Nunito_800ExtraBold';

function ItemTile({ item }: { item: FinItem }) {
  const { availableStars, unlockedFinItemKeys, equippedFinItemKeys, unlockFinItem, toggleEquipFinItem } = useRewardsState();
  const owned = unlockedFinItemKeys.includes(item.key);
  const equipped = equippedFinItemKeys[item.category] === item.key;
  const affordable = item.cost <= availableStars;

  const handlePress = () => {
    if (owned) {
      toggleEquipFinItem(item.key);
    } else if (affordable) {
      unlockFinItem(item.key);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        equipped && styles.tileEquipped,
        !owned && !affordable && styles.tileLocked,
        pressed && styles.pressed,
      ]}
      disabled={!owned && !affordable}
      onPress={handlePress}>
      <Text style={[styles.tileIcon, !owned && !affordable && styles.tileIconLocked]}>{item.icon}</Text>
      <Text style={styles.tileName}>{item.name}</Text>
      {owned ? (
        equipped ? (
          <View style={styles.equippedPill}>
            <Text style={styles.equippedPillText}>Equipped ✓</Text>
          </View>
        ) : (
          <Text style={styles.tapToEquip}>Tap to equip</Text>
        )
      ) : (
        <View style={[styles.costPill, !affordable && styles.costPillLocked]}>
          <Text style={[styles.costPillText, !affordable && styles.costPillTextLocked]}>
            {affordable ? '' : '🔒 '}⭐ {item.cost}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function CustomizeFinScreen() {
  const router = useRouter();
  const { availableStars } = useRewardsState();
  const [category, setCategory] = useState<FinItemCategory>('hat');

  const itemsInCategory = FIN_ITEMS.filter((item) => item.category === category);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Customize Fin</Text>
        <View style={styles.starsPill}>
          <Text style={styles.starsPillText}>⭐ {availableStars}</Text>
        </View>
      </View>

      <View style={styles.finPreviewArea}>
        <FinCharacter state="idle" size={150} />
      </View>

      <View style={styles.tabRow}>
        {FIN_ITEM_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.tab, category === cat && styles.tabActive]}
            onPress={() => setCategory(cat)}>
            <Text style={[styles.tabText, category === cat && styles.tabTextActive]}>{FIN_ITEM_CATEGORY_LABELS[cat]}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tileRow}>
          {itemsInCategory.map((item) => (
            <ItemTile key={item.key} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: PALETTE.brandBlue,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    fontFamily: BODY_BOLD,
    fontSize: 14,
    color: PALETTE.brandBlue,
  },
  screenTitle: {
    fontFamily: TITLE_FONT,
    fontSize: 20,
    color: PALETTE.textDark,
  },
  starsPill: {
    backgroundColor: '#FFF9E8',
    borderWidth: 1.5,
    borderColor: PALETTE.yellow,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  starsPillText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 13,
    color: '#8B6A0E',
  },
  finPreviewArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#E3ECF2',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: PALETTE.brandBlue,
  },
  tabText: {
    fontFamily: BODY_BOLD,
    fontSize: 13,
    color: PALETTE.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flex: 1,
    marginTop: 16,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '31%',
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tileEquipped: {
    borderColor: PALETTE.brandBlue,
    backgroundColor: '#EAF4FB',
  },
  tileLocked: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.85,
  },
  tileIcon: {
    fontSize: 32,
  },
  tileIconLocked: {
    opacity: 0.4,
  },
  tileName: {
    fontFamily: BODY_BOLD,
    fontSize: 12,
    color: PALETTE.textDark,
    marginTop: 8,
    textAlign: 'center',
  },
  costPill: {
    backgroundColor: '#FFF9E8',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  costPillLocked: {
    backgroundColor: '#F1F5F8',
  },
  costPillText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 11,
    color: '#8B6A0E',
  },
  costPillTextLocked: {
    color: PALETTE.textMuted,
  },
  tapToEquip: {
    fontFamily: BODY_FONT,
    fontSize: 10,
    color: PALETTE.textMuted,
    marginTop: 8,
  },
  equippedPill: {
    backgroundColor: PALETTE.brandBlue,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  equippedPillText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 10,
    color: '#FFFFFF',
  },
});
