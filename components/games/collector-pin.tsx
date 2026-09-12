import { BadgeTier, GameBadge, TIER_STYLES } from '@/components/games/game-badge';

export type PinTier = Exclude<BadgeTier, 'locked'>;

export const PIN_TIER_ORDER: PinTier[] = ['bronze', 'silver', 'gold'];

export const PIN_LABELS = Object.fromEntries(
  PIN_TIER_ORDER.map((tier) => [tier, TIER_STYLES[tier].label])
) as Record<PinTier, string>;

export function CollectorPin({
  source,
  tier,
  unlocked,
  size = 76,
}: {
  source: number;
  tier: PinTier;
  unlocked: boolean;
  size?: number;
}) {
  return <GameBadge source={source} tier={unlocked ? tier : 'locked'} size={size} />;
}
