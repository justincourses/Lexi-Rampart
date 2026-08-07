import {
  SECONDARY_BOLT_POWER,
  EMBER_BASE_CAP,
  EMBER_CAP_PER_WEAPON_LEVEL,
  MANA_BASE_CAP,
  MANA_CAP_PER_CHARM_LEVEL,
  SHIELD_MAX_RATIO,
  FORGE_START,
  FORGE_LEVEL_STEP,
  FORGE_LATE_STEP,
  FORGE_EARLY_LEVELS,
  UPGRADE_SLOTS,
  ARMOR_WALL_BONUS,
  WAVE_INTERMISSION_MS,
  MAX_SUPPORTED_WAVE,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  BASE_ENEMY_STATS,
  EMBER_DAMAGE_MULTIPLIER
} from './constants.js';
import { clamp } from './utils.js';

export function autoUpgradeSlot(equipment, index = 0) {
  const minimum = Math.min(...UPGRADE_SLOTS.map((slot) => equipment[slot]));
  const candidates = UPGRADE_SLOTS.filter((slot) => equipment[slot] === minimum);
  return candidates[index % candidates.length];
}

export function currentUpgradeSlot(mode, equipment, autoIndex = 0) {
  return mode === 'auto' ? autoUpgradeSlot(equipment, autoIndex) : mode;
}

export function forgeCostFor(slot, equipment) {
  const level = Math.max(1, Math.floor(Number(equipment[slot]) || 1));
  const earlySteps = Math.min(level - 1, FORGE_EARLY_LEVELS - 1);
  const lateSteps = Math.max(0, level - FORGE_EARLY_LEVELS);
  return FORGE_START + earlySteps * FORGE_LEVEL_STEP + lateSteps * FORGE_LATE_STEP;
}

export function upgradeSlotLabel(slot) {
  return { weapon: '攻击', armor: '防御', charm: '攻速' }[slot] || '攻击';
}

export function weaponPower(level) {
  const steps = Math.max(0, Math.floor(level) - 1);
  const scaledSteps = Math.min(19, steps);
  const overflow = Math.max(0, steps - scaledSteps);
  return Math.round(27 + 50 * scaledSteps * (1.07 ** scaledSteps) + overflow * 260);
}

export function emberCapacity(level = 1) {
  return EMBER_BASE_CAP + Math.max(0, Math.floor(Number(level) || 1) - 1) * EMBER_CAP_PER_WEAPON_LEVEL;
}

export function manaCapacity(level = 1) {
  return MANA_BASE_CAP + Math.max(0, Math.floor(Number(level) || 1) - 1) * MANA_CAP_PER_CHARM_LEVEL;
}

export function wallDefenseForLevel(level = 1) {
  return Math.min(72, 6 + (Math.max(1, Math.floor(Number(level) || 1)) - 1) * 6);
}

export function shieldCapacity(wallMax) {
  return Math.max(1, Math.round(wallMax * SHIELD_MAX_RATIO));
}

export function reinforcementReward(groups = []) {
  const base = groups.length;
  const longBonus = groups.reduce((sum, group) => sum + (group.length >= 5 ? 2 : group.length === 4 ? 1 : 0), 0);
  const coinBonus = groups.filter((group) => group.type === 'coin').length;
  return { base, longBonus, coinBonus, total: base + longBonus + coinBonus };
}

export function normalizeDifficultyKey(key, defaultDifficulty = DEFAULT_DIFFICULTY) {
  const migratedKey = key === 'rookie' ? defaultDifficulty : key;
  return DIFFICULTIES[migratedKey] ? migratedKey : defaultDifficulty;
}

export function difficultyConfig(key) {
  return DIFFICULTIES[normalizeDifficultyKey(key)];
}

export function waveLimitForDifficulty(key) {
  // Retain the existing API for saves/test hooks. Every difficulty is endless;
  // this value only prevents unsafe integers from entering formulas or storage.
  difficultyConfig(key);
  return MAX_SUPPORTED_WAVE;
}

export function isEndlessDifficulty(key) {
  const difficulty = difficultyConfig(key);
  return Boolean(difficulty.infinite || difficulty.endless);
}

export function normalizeWave(value, difficultyKey, fallback = 1) {
  const numeric = Number(value);
  const wave = Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
  return clamp(wave, 1, waveLimitForDifficulty(difficultyKey));
}

export function formatWaveProgress(wave, difficultyKey, pad = false) {
  difficultyConfig(difficultyKey);
  return pad ? String(wave).padStart(3, '0') : String(wave);
}

export function getWaveProfile(wave, difficultyKey) {
  const normalizedDifficulty = normalizeDifficultyKey(difficultyKey);
  const difficulty = difficultyConfig(normalizedDifficulty);
  const safeWave = normalizeWave(wave, normalizedDifficulty);
  const tier = Math.floor((safeWave - 1) / 10);
  const adaptationStep = Math.min(safeWave - 1, 9);
  const adaptationProgress = adaptationStep / 9;
  const postAdaptationWave = Math.max(0, safeWave - 10);
  // Infinite defense keeps battlefield density bounded for browser performance;
  // enemy HP, damage, defense and speed still rise on every single wave.
  const densityWave = Math.min(safeWave, 240);
  const densityAdaptationStep = Math.min(densityWave - 1, 9);
  const densityPostAdaptationWave = Math.max(0, densityWave - 10);
  const densityTier = Math.floor((densityWave - 1) / 10);
  const baseGroups = 4
    + Math.floor(densityAdaptationStep * .12)
    + Math.floor(densityPostAdaptationWave * .09)
    + Math.floor(densityTier * 1.25);
  const baseCount = 8
    + Math.floor(densityAdaptationStep * .22)
    + Math.floor(densityPostAdaptationWave * .42)
    + densityTier * 3;
  const isBossWave = safeWave % 10 === 0;
  // Waves 1–10 are a development runway. From wave 11 onward every wave
  // grows faster, while each new ten-wave stage adds a separate pressure jump.
  const hpScale = (.82 + adaptationProgress * .18)
    * (1 + postAdaptationWave * .04)
    * (1 + tier * .11)
    * difficulty.statScale * difficulty.durabilityScale;
  const damageScale = (.78 + adaptationProgress * .22)
    * (1 + postAdaptationWave * .022)
    * (1 + tier * .085)
    * difficulty.statScale;
  const defenseScale = (.84 + adaptationProgress * .16)
    * (1 + postAdaptationWave * .02)
    * (1 + tier * .075)
    * difficulty.statScale;
  const speedScale = (.9 + adaptationProgress * .1)
    * (1 + postAdaptationWave * .002)
    * (1 + tier * .02)
    * difficulty.speedFactor;
  const advancedChance = clamp(
    .48
      + adaptationStep * .0025
      + postAdaptationWave * .003
      + tier * .04
      + difficulty.eliteOffset
      - (1 - adaptationProgress) * .1,
    .18,
    difficulty.eliteCap
  );
  const spawnInterval = Math.max(280, (
    1050
      + (1 - adaptationProgress) * 150
      - adaptationStep * 3.2
      - postAdaptationWave * 3.7
      - tier * 62
  ) / difficulty.pressure);
  return {
    wave: safeWave,
    tier,
    stage: tier + 1,
    requiredGroups: Math.max(3, Math.ceil(baseGroups * difficulty.groupScale)),
    enemyCount: Math.max(7, Math.round(baseCount * difficulty.pressure)),
    advancedChance,
    hpScale,
    // Breach damage grows more slowly than durability so a few leaks hurt
    // without making late waves collapse the wall in two or three hits.
    damageScale,
    defenseScale,
    speedScale,
    intensity: hpScale * damageScale * defenseScale * speedScale,
    batchSize: Math.min(8, 1 + Math.floor(tier / difficulty.batchDivisor)),
    bossCount: isBossWave ? Math.min(5, 1 + Math.floor(tier / 5)) : 0,
    isBossWave,
    enemyRelicChance: clamp(
      difficulty.enemyRelicChance + tier * difficulty.enemyRelicGrowth,
      difficulty.enemyRelicChance,
      difficulty.enemyRelicChance + difficulty.enemyRelicGrowth * 10
    ),
    enemyRelicCapPerWave: difficulty.enemyRelicCapPerWave,
    runeRelicChance: difficulty.runeRelicChance,
    spawnInterval,
    intermission: WAVE_INTERMISSION_MS
  };
}

export function breachDamageProfile(type = 'raider', wave = 1, difficulty = DEFAULT_DIFFICULTY, armorLevel = 1) {
  const stats = BASE_ENEMY_STATS[type] || BASE_ENEMY_STATS.raider;
  const profile = getWaveProfile(wave, difficulty);
  const safeArmorLevel = Math.max(1, Math.floor(Number(armorLevel) || 1));
  const defense = wallDefenseForLevel(safeArmorLevel);
  const wallMax = 1120 + (safeArmorLevel - 1) * ARMOR_WALL_BONUS;
  const displayedDamage = Math.round(stats.damage * profile.damageScale);
  const finalDamage = Math.max(1, Math.round(displayedDamage * (1 - defense / 100)));
  return {
    type,
    wave: profile.wave,
    difficulty,
    armorLevel: safeArmorLevel,
    baseDamage: stats.damage,
    displayedDamage,
    defense,
    finalDamage,
    wallMax,
    shieldMax: shieldCapacity(wallMax)
  };
}

export function simulateBalance(difficultyKey = 'master', efficiency = 1) {
  let forge = 0;
  const equipment = { weapon: 1, armor: 1, charm: 1 };
  let autoUpgradeIndex = 0;
  let firstFailure = null;
  let minimumMargin = Infinity;
  const calibrationWaveLimit = 100;

  for (let wave = 1; wave <= Math.min(calibrationWaveLimit, waveLimitForDifficulty(difficultyKey)); wave += 1) {
    const profile = getWaveProfile(wave, difficultyKey);
    forge += profile.requiredGroups * 1.35 * efficiency;
    while (true) {
      const slot = autoUpgradeSlot(equipment, autoUpgradeIndex);
      const cost = forgeCostFor(slot, equipment);
      if (forge < cost) break;
      forge -= cost;
      equipment[slot] += 1;
      autoUpgradeIndex += 1;
    }

    const power = weaponPower(equipment.weapon);
    const rate = 1000 / Math.max(220, 1050 - equipment.charm * 80);
    const emberFactor = 1 + (EMBER_DAMAGE_MULTIPLIER - 1) * .55 * efficiency;
    const bruteWeight = Math.min(.42, .28 + profile.tier * .014);
    const assaultWeight = 1 - .34 - bruteWeight;
    const advancedHp = 70 * .34 + 120 * assaultWeight + 210 * bruteWeight;
    const advancedDefense = 1 * .34 + 2 * assaultWeight + 13 * bruteWeight;
    const averageHp = 100 * (1 - profile.advancedChance) + advancedHp * profile.advancedChance;
    const averageDefense = 3 * (1 - profile.advancedChance) + advancedDefense * profile.advancedChance;
    const regularCount = profile.enemyCount - profile.bossCount;
    const regularDurability = regularCount * averageHp * profile.hpScale * (1 + averageDefense * profile.defenseScale * .02);
    const bossDurability = profile.bossCount * 1050 * profile.hpScale * (1 + 20 * profile.defenseScale * .02);
    const activeSeconds = Math.ceil(profile.enemyCount / profile.batchSize) * profile.spawnInterval / 1000
      + 85 / (3 * profile.speedScale);
    const idealOutput = power * rate * activeSeconds * 1.22 * emberFactor * efficiency;
    const margin = idealOutput / (regularDurability + bossDurability);
    minimumMargin = Math.min(minimumMargin, margin);
    if (margin < 1 && firstFailure === null) firstFailure = wave;
  }

  return { difficulty: difficultyKey, efficiency, firstFailure, minimumMargin, equipment };
}

// Keep secondary bolt export for formula consumers
export { SECONDARY_BOLT_POWER };
