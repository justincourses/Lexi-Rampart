import { g } from './shared.js';
import {
  EQUIPMENT, SECONDARY_BOLT_POWER, ARMOR_WALL_BONUS, DEFAULT_DIFFICULTY, BASE_ENEMY_STATS
} from './constants.js';
import * as combatMath from './combat-math.js';

export function attachCombatStats() {
  function equipmentName(slot) {
    const names = EQUIPMENT[slot];
    return names[Math.min(g.state.equipment[slot] - 1, names.length - 1)];
  }

  function weaponPower(level) {
    return combatMath.weaponPower(level);
  }

  function totalPower() {
    return g.weaponPower(g.state.equipment.weapon);
  }

  function emberCapacity(level = g.state.equipment.weapon) {
    return combatMath.emberCapacity(level);
  }

  function manaCapacity(level = g.state.equipment.charm) {
    return combatMath.manaCapacity(level);
  }

  function baseAttackDelay() {
    return Math.max(220, 1050 - g.state.equipment.charm * 80);
  }

  function volleySize() {
    return Math.min(4, 1 + Math.floor((g.state.equipment.charm - 1) / 3));
  }

  function volleyPower() {
    return 1 + (g.volleySize() - 1) * SECONDARY_BOLT_POWER;
  }

  function attackDelay() {
    return Math.round(g.baseAttackDelay() * g.volleyPower());
  }

  function attackRate() {
    return (g.volleySize() * 1000 / g.attackDelay()).toFixed(1);
  }

  function volleyLabel() {
    return ['单发', '双发', '三发', '四发'][g.volleySize() - 1];
  }

  function charmStatLabel() {
    return `${g.volleyLabel()} · ${g.attackRate()}/秒`;
  }

  function wallDefenseForLevel(level = 1) {
    return combatMath.wallDefenseForLevel(level);
  }

  function wallDefense() {
    return g.wallDefenseForLevel(g.state.equipment.armor);
  }

  function shieldCapacity(wallMax = g.state.wallMax) {
    return combatMath.shieldCapacity(wallMax);
  }

  function applyMossSupport(amount, announce = true) {
    const offered = Math.max(0, Math.round(Number(amount) || 0));
    const restored = Math.min(offered, Math.max(0, g.state.wallMax - g.state.wall));
    g.state.wall += restored;
    g.state.repaired += restored;
    const shieldOffered = offered - restored;
    const shieldGained = Math.min(shieldOffered, Math.max(0, g.shieldCapacity() - g.state.shield));
    g.state.shield += shieldGained;
    const accepted = restored + shieldGained;
    if (announce) {
      const delta = [restored ? `耐久 +${restored}` : '', shieldGained ? `护盾 +${shieldGained}` : ''].filter(Boolean).join(' · ');
      g.pulseResource('moss', accepted ? `+${accepted}` : '已满');
      g.showCombatToast(delta || '能量已满', 'shield', 20, 53);
      g.addLog(delta ? `防御能量分配：${delta}` : '防御能量溢散：耐久与护盾均已达到上限');
    }
    return {
      offered,
      accepted,
      energyAccepted: accepted,
      energyCapacity: g.shieldCapacity(),
      restored,
      shieldGained,
      shield: g.state.shield,
      shieldMax: g.shieldCapacity(),
      wall: g.state.wall
    };
  }

  function breachDamageProfile(type = 'raider', wave = 1, difficulty = DEFAULT_DIFFICULTY, armorLevel = 1) {
    return combatMath.breachDamageProfile(type, wave, difficulty, armorLevel);
  }

  g.equipmentName = equipmentName;
  g.weaponPower = weaponPower;
  g.totalPower = totalPower;
  g.emberCapacity = emberCapacity;
  g.manaCapacity = manaCapacity;
  g.baseAttackDelay = baseAttackDelay;
  g.volleySize = volleySize;
  g.volleyPower = volleyPower;
  g.attackDelay = attackDelay;
  g.attackRate = attackRate;
  g.volleyLabel = volleyLabel;
  g.charmStatLabel = charmStatLabel;
  g.wallDefenseForLevel = wallDefenseForLevel;
  g.wallDefense = wallDefense;
  g.shieldCapacity = shieldCapacity;
  g.applyMossSupport = applyMossSupport;
  g.breachDamageProfile = breachDamageProfile;
}
