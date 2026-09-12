// Unlockable Fin cosmetics for the Rewards → Customize Fin screen. `icon` is a placeholder
// emoji stand-in — swap in real art later by editing only this file, same pattern as
// new-games-catalog.ts's placeholder icons. `category` doubles as the equip slot: Fin can wear
// at most one hat, one accessory, and one background at a time.

export type FinItemCategory = 'hat' | 'accessory' | 'background';

export type FinItem = {
  key: string;
  category: FinItemCategory;
  name: string;
  cost: number;
  icon: string;
};

export const FIN_ITEM_CATEGORY_LABELS: Record<FinItemCategory, string> = {
  hat: 'Hats',
  accessory: 'Accessories',
  background: 'Backgrounds',
};

export const FIN_ITEMS: FinItem[] = [
  // Hats
  { key: 'hat-winter-beanie', category: 'hat', name: 'Winter Beanie', cost: 15, icon: '🧢' },
  { key: 'hat-party', category: 'hat', name: 'Party Hat', cost: 25, icon: '🎉' },
  { key: 'hat-headphones', category: 'hat', name: 'Headphones', cost: 40, icon: '🎧' },

  // Accessories
  { key: 'accessory-scarf', category: 'accessory', name: 'Scarf', cost: 15, icon: '🧣' },
  { key: 'accessory-sunglasses', category: 'accessory', name: 'Sunglasses', cost: 25, icon: '🕶️' },
  { key: 'accessory-backpack', category: 'accessory', name: 'Backpack', cost: 35, icon: '🎒' },

  // Backgrounds
  { key: 'background-aurora', category: 'background', name: 'Aurora Sky', cost: 50, icon: '🌌' },
  { key: 'background-village', category: 'background', name: 'Snowy Village', cost: 70, icon: '🏘️' },
  { key: 'background-ice-cave', category: 'background', name: 'Ice Cave', cost: 90, icon: '🧊' },
];

export function findFinItem(key: string): FinItem | undefined {
  return FIN_ITEMS.find((item) => item.key === key);
}

export const FIN_ITEM_CATEGORIES: FinItemCategory[] = ['hat', 'accessory', 'background'];
