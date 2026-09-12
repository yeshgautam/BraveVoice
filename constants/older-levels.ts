export type Level = { name: string; xpRequired: number };

export const LEVELS: Level[] = [
  { name: 'Frost Pup', xpRequired: 0 },
  { name: 'Snowflake Scout', xpRequired: 100 },
  { name: 'Ice Cub', xpRequired: 220 },
  { name: 'Snow Walker', xpRequired: 500 },
  { name: 'Glacier Runner', xpRequired: 750 },
  { name: 'Aurora Voice', xpRequired: 1000 },
  { name: 'Arctic Champion', xpRequired: 1200 },
];

export function getLevelProgress(totalXP: number) {
  let currentIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXP >= LEVELS[i].xpRequired) currentIndex = i;
  }
  const level = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] ?? null;
  const ratio = next
    ? Math.min(1, (totalXP - level.xpRequired) / (next.xpRequired - level.xpRequired))
    : 1;
  return { level, levelNumber: currentIndex + 1, next, ratio };
}
