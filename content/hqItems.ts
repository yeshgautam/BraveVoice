// Unlockable furniture/decoration for Rewards → Fin's Arctic HQ. `icon` is a placeholder emoji
// stand-in for real art later, same pattern as finItems.ts. Any owned item can go in any slot —
// no per-slot type restriction, to keep placement simple (per spec: fixed slots, not free-form
// dragging).

export type HqItem = {
  key: string;
  name: string;
  cost: number;
  icon: string;
};

export const HQ_ITEMS: HqItem[] = [
  { key: 'hq-fireplace', name: 'Fireplace', cost: 40, icon: '🔥' },
  { key: 'hq-fish-tank', name: 'Fish Tank', cost: 35, icon: '🐠' },
  { key: 'hq-bookshelf', name: 'Bookshelf', cost: 30, icon: '📚' },
  { key: 'hq-couch', name: 'Cozy Couch', cost: 25, icon: '🛋️' },
  { key: 'hq-lantern', name: 'Lantern', cost: 20, icon: '🏮' },
  { key: 'hq-plant', name: 'Potted Plant', cost: 15, icon: '🪴' },
  { key: 'hq-sled', name: 'Sled', cost: 25, icon: '🛷' },
  { key: 'hq-snowman', name: 'Snowman', cost: 45, icon: '⛄' },
];

export function findHqItem(key: string): HqItem | undefined {
  return HQ_ITEMS.find((item) => item.key === key);
}

export type HqSlot = {
  key: string;
  label: string;
};

/** Fixed placement slots — 4 indoor, 2 outdoor. Keeping this a short, named list (not
 * free-form/grid-based) is what keeps placement "tap to place in a slot" instead of drag. */
export const HQ_SLOTS: HqSlot[] = [
  { key: 'window', label: 'Window' },
  { key: 'left-wall', label: 'Left Wall' },
  { key: 'right-wall', label: 'Right Wall' },
  { key: 'floor-center', label: 'Center Floor' },
  { key: 'outdoor-left', label: 'Outside — Left' },
  { key: 'outdoor-right', label: 'Outside — Right' },
];
