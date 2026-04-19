// Level = floor(XP / 100) + 1
// So: 0 XP = Level 1, 100 XP = Level 2, 200 XP = Level 3, etc.

export function getLevel(xp) {
  return Math.floor((xp || 0) / 100) + 1;
}

// Progress toward next level as a percentage (0-100)
export function getLevelProgress(xp) {
  return (xp || 0) % 100;
}

// XP needed to reach the next level
export function xpToNextLevel(xp) {
  return 100 - ((xp || 0) % 100);
}
