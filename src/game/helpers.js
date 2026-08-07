import { g } from './shared.js';
import { TYPES, DIFFICULTIES, RELICS } from './constants.js';

export function attachHelpers() {
  g.randomType = () => TYPES[Math.floor(Math.random() * TYPES.length)];
  g.randomRuneRelic = () => {
    const chance = DIFFICULTIES[g.state.difficulty]?.runeRelicChance || 0;
    if (Math.random() >= chance) return null;
    const relicTypes = Object.keys(RELICS);
    return relicTypes[Math.floor(Math.random() * relicTypes.length)];
  };

}
