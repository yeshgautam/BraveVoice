import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HQ_ITEMS, HQ_SLOTS, findHqItem } from '@/content/hqItems';
import { useRewardsState } from '@/contexts/rewards-context';

const PALETTE = {
  background: '#EEF6FB',
  card: '#FFFFFF',
  brandBlue: '#1A6FA8',
  coral: '#E8724A',
  yellow: '#F5C842',
  textDark: '#1A2A3A',
  textMuted: '#7A9AB0',
  border: '#C8DFF0',
  room: '#F3E7D3',
  outdoor: '#DCEFFB',
};

const TITLE_FONT = 'FredokaOne_400Regular';
const BODY_FONT = 'Nunito_400Regular';
const BODY_BOLD = 'Nunito_700Bold';
const BODY_EXTRABOLD = 'Nunito_800ExtraBold';

const INDOOR_SLOT_KEYS = ['window', 'left-wall', 'right-wall', 'floor-center'];

export default function ArcticHqScreen() {
  const router = useRouter();
  const { availableStars, unlockedHqItemKeys, hqPlacements, unlockHqItem, placeHqItem } = useRewardsState();
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);

  const placedItemKeys = new Set(Object.values(hqPlacements).filter(Boolean) as string[]);
  const unplacedOwnedItems = HQ_ITEMS.filter((item) => unlockedHqItemKeys.includes(item.key) && !placedItemKeys.has(item.key));
  const lockedItems = HQ_ITEMS.filter((item) => !unlockedHqItemKeys.includes(item.key));

  const handleSlotPress = (slotKey: string) => {
    const currentItemKey = hqPlacements[slotKey];
    if (selectedItemKey) {
      placeHqItem(slotKey, selectedItemKey);
      setSelectedItemKey(null);
    } else if (currentItemKey) {
      placeHqItem(slotKey, null);
    }
  };

  const handleInventoryPress = (item: (typeof HQ_ITEMS)[number], owned: boolean) => {
    if (!owned) {
      unlockHqItem(item.key);
      return;
    }
    setSelectedItemKey((key) => (key === item.key ? null : item.key));
  };

  const renderSlot = (slotKey: string, style: 'room' | 'outdoor') => {
    const slot = HQ_SLOTS.find((s) => s.key === slotKey)!;
    const itemKey = hqPlacements[slotKey];
    const item = itemKey ? findHqItem(itemKey) : undefined;
    return (
      <Pressable
        key={slotKey}
        style={({ pressed }) => [
          styles.slot,
          style === 'room' ? styles.slotRoom : styles.slotOutdoor,
          selectedItemKey && !item && styles.slotHighlighted,
          pressed && styles.pressed,
        ]}
        onPress={() => handleSlotPress(slotKey)}>
        <Text style={styles.slotIcon}>{item?.icon ?? '+'}</Text>
        <Text style={styles.slotLabel}>{slot.label}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.screenTitle}>Fin&apos;s Arctic HQ</Text>
        <View style={styles.starsPill}>
          <Text style={styles.starsPillText}>⭐ {availableStars}</Text>
        </View>
      </View>

      {selectedItemKey && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintBannerText}>Tap a spot in the scene to place {findHqItem(selectedItemKey)?.name}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sceneLabel}>Inside</Text>
        <View style={styles.sceneGrid}>{INDOOR_SLOT_KEYS.map((key) => renderSlot(key, 'room'))}</View>

        <Text style={styles.sceneLabel}>Outside</Text>
        <View style={styles.sceneGridOutdoor}>{renderSlot('outdoor-left', 'outdoor')}{renderSlot('outdoor-right', 'outdoor')}</View>

        <Text style={styles.sceneLabel}>Your Items</Text>
        <View style={styles.inventoryRow}>
          {unplacedOwnedItems.length === 0 && lockedItems.length === 0 && (
            <Text style={styles.emptyInventoryText}>Everything you own is placed!</Text>
          )}
          {unplacedOwnedItems.map((item) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.invTile, selectedItemKey === item.key && styles.invTileSelected, pressed && styles.pressed]}
              onPress={() => handleInventoryPress(item, true)}>
              <Text style={styles.invIcon}>{item.icon}</Text>
              <Text style={styles.invName}>{item.name}</Text>
              <Text style={styles.invHint}>{selectedItemKey === item.key ? 'Selected' : 'Tap to place'}</Text>
            </Pressable>
          ))}
          {lockedItems.map((item) => {
            const affordable = item.cost <= availableStars;
            return (
              <Pressable
                key={item.key}
                style={({ pressed }) => [styles.invTile, styles.invTileLocked, pressed && affordable && styles.pressed]}
                disabled={!affordable}
                onPress={() => handleInventoryPress(item, false)}>
                <Text style={[styles.invIcon, styles.invIconLocked]}>{item.icon}</Text>
                <Text style={styles.invName}>{item.name}</Text>
                <View style={[styles.costPill, !affordable && styles.costPillDim]}>
                  <Text style={styles.costPillText}>{affordable ? '' : '🔒 '}⭐ {item.cost}</Text>
                </View>
              </Pressable>
            );
          })}
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
    fontSize: 18,
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
  hintBanner: {
    backgroundColor: PALETTE.brandBlue,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  hintBannerText: {
    fontFamily: BODY_BOLD,
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  sceneLabel: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 12,
    color: PALETTE.textMuted,
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  sceneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sceneGridOutdoor: {
    flexDirection: 'row',
    gap: 10,
  },
  slot: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRoom: {
    backgroundColor: PALETTE.room,
    width: '47%',
  },
  slotOutdoor: {
    backgroundColor: PALETTE.outdoor,
    flex: 1,
  },
  slotHighlighted: {
    borderColor: PALETTE.brandBlue,
    borderStyle: 'solid',
  },
  slotIcon: {
    fontSize: 34,
  },
  slotLabel: {
    fontFamily: BODY_BOLD,
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  inventoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyInventoryText: {
    fontFamily: BODY_FONT,
    fontSize: 13,
    color: PALETTE.textMuted,
  },
  invTile: {
    width: '30%',
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  invTileSelected: {
    borderColor: PALETTE.coral,
    backgroundColor: '#FDEDE6',
  },
  invTileLocked: {
    opacity: 0.85,
  },
  invIcon: {
    fontSize: 28,
  },
  invIconLocked: {
    opacity: 0.4,
  },
  invName: {
    fontFamily: BODY_BOLD,
    fontSize: 11,
    color: PALETTE.textDark,
    marginTop: 6,
    textAlign: 'center',
  },
  invHint: {
    fontFamily: BODY_FONT,
    fontSize: 10,
    color: PALETTE.textMuted,
    marginTop: 4,
  },
  costPill: {
    backgroundColor: '#FFF9E8',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  costPillDim: {
    backgroundColor: '#F1F5F8',
  },
  costPillText: {
    fontFamily: BODY_EXTRABOLD,
    fontSize: 10,
    color: '#8B6A0E',
  },
});
