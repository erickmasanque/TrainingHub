// Level = floor(0.1 * sqrt(XP)) + 1
// So: 0 XP = Lv 1, 100 XP = Lv 2, 400 XP = Lv 3, 900 XP = Lv 4, etc.

export function getLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp || 0)) + 1;
}

function getXpForLevel(level) {
  return 100 * Math.pow(level - 1, 2);
}

// Progress toward next level as a percentage (0-100)
export function getLevelProgress(xp) {
  const currentLevel = getLevel(xp);
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = (xp || 0) - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  
  if (xpNeededForNextLevel === 0) return 0;
  return Math.floor(Math.min(100, Math.max(0, (xpIntoLevel / xpNeededForNextLevel) * 100)));
}

// XP needed to reach the next level
export function xpToNextLevel(xp) {
  const currentLevel = getLevel(xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  return Math.ceil(nextLevelXp - (xp || 0));
}
