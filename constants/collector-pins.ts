import { PIN_TIER_ORDER, PinTier } from '@/components/games/collector-pin';
import { ALL_GAMES_ORDERED } from '@/constants/games-catalog';
import { XP_PER_STAR } from '@/contexts/progress-context';

export const COLLECTOR_TOTAL = 12;
export const STARS_PER_PIN = 3;

export type CollectorPinEntry = {
  tier: PinTier;
  starsRequired: number;
  xpRequired: number;
  design: number;
};

export const COLLECTOR_PINS: CollectorPinEntry[] = Array.from({ length: COLLECTOR_TOTAL }, (_, i) => {
  const starsRequired = (i + 1) * STARS_PER_PIN;
  return {
    tier: PIN_TIER_ORDER[i % PIN_TIER_ORDER.length],
    starsRequired,
    xpRequired: starsRequired * XP_PER_STAR,
    design: ALL_GAMES_ORDERED[i % ALL_GAMES_ORDERED.length].badge,
  };
});

export function getCollectorProgress(totalXP: number) {
  const collectedCount = COLLECTOR_PINS.filter((pin) => totalXP >= pin.xpRequired).length;
  const nextPin = COLLECTOR_PINS[collectedCount] ?? null;
  return { collectedCount, nextPin };
}
