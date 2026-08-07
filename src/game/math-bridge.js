import { g } from './shared.js';
import { DEFAULT_DIFFICULTY } from './constants.js';
import * as combatMath from './combat-math.js';

export function attachMathBridge() {
  function getWaveProfile(wave, difficultyKey = g.state.difficulty) {
    return combatMath.getWaveProfile(wave, difficultyKey);
  }

  function autoUpgradeSlot(equipment = g.state.equipment, index = g.state.autoUpgradeIndex) {
    return combatMath.autoUpgradeSlot(equipment, index);
  }

  function currentUpgradeSlot(mode = g.state.upgradeMode, equipment = g.state.equipment, autoIndex = g.state.autoUpgradeIndex) {
    return combatMath.currentUpgradeSlot(mode, equipment, autoIndex);
  }

  function forgeCostFor(slot, equipment = g.state.equipment) {
    return combatMath.forgeCostFor(slot, equipment);
  }

  function syncForgeTarget() {
    const slot = g.currentUpgradeSlot();
    g.state.forgeTarget = g.forgeCostFor(slot);
    return slot;
  }

  function upgradeSlotLabel(slot) {
    return combatMath.upgradeSlotLabel(slot);
  }

  function updateUpgradeTargetUI() {
    const slot = g.syncForgeTarget();
    const label = g.upgradeSlotLabel(slot);
    const level = g.state.equipment[slot];
    g.$('#strategyHint').textContent = g.state.upgradeMode === 'auto'
      ? `自动 · 本次${label}`
      : `${label}优先 · 持续生效`;
    g.$('#forgeTargetName').textContent = `${label} LV.${level}→${level + 1}`;
    return slot;
  }

  // Deterministic balance model used by the browser regression suite. Every
  // successful group grants base reinforcement progress; coin and long groups
  // average another 35%. Ember charges amplify a portion of normal volleys.
  function simulateBalance(difficultyKey = 'master', efficiency = 1) {
    return combatMath.simulateBalance(difficultyKey, efficiency);
  }

  g.getWaveProfile = getWaveProfile;
  g.autoUpgradeSlot = autoUpgradeSlot;
  g.currentUpgradeSlot = currentUpgradeSlot;
  g.forgeCostFor = forgeCostFor;
  g.syncForgeTarget = syncForgeTarget;
  g.upgradeSlotLabel = upgradeSlotLabel;
  g.updateUpgradeTargetUI = updateUpgradeTargetUI;
  g.simulateBalance = simulateBalance;
}
