import { g } from './shared.js';
import { MUSIC_TRACKS } from './music-tracks.js';
import { MANA_CAST_COST, UPGRADE_SLOTS, RELICS } from './constants.js';

export function attachHud() {
  function updateFieldHud() {
    g.$('#hudAttack').textContent = g.totalPower();
    g.$('#hudDefense').textContent = `${g.wallDefense()}%`;
    g.$('#hudSpeed').textContent = g.attackRate();
  }

  function setUpgradeMode(mode, announce = true) {
    if (!['auto', ...UPGRADE_SLOTS].includes(mode)) return;
    g.state.upgradeMode = mode;
    const slot = g.updateUpgradeTargetUI();
    document.querySelectorAll('.strategy-button').forEach((button) => {
      const active = button.dataset.upgrade === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (g.state.started && announce) {
      g.sound.play('click', .14, 1.08);
      g.addLog(`${mode === 'auto' ? '自动策略本次选择' : '锻造目标切换为'}「${g.upgradeSlotLabel(slot)}」，LV.${g.state.equipment[slot]}→${g.state.equipment[slot] + 1} 需要 ${g.state.forgeTarget} 补强`);
      if (!g.state.paused) g.checkForge();
      g.updateUI();
    }
  }

  function updateCombo() {
    g.$('#comboValue').textContent = String(g.state.correctStreak);
    g.$('#comboBadge').classList.toggle('is-hot', g.state.correctStreak > 1);
  }

  function updateSoundButton() {
    g.els.soundButton.classList.toggle('is-muted', g.sound.muted);
    g.els.soundButton.setAttribute('aria-label', g.sound.muted ? '开启音效' : '关闭音效');
    g.els.soundButton.removeAttribute('title');
    g.els.soundButton.querySelector('span').textContent = g.sound.muted ? '×' : '♪';
  }

  function updateMusicButton() {
    const track = g.music.currentTrack();
    const nextTrack = MUSIC_TRACKS[(g.music.trackIndex + 1) % MUSIC_TRACKS.length];
    const action = g.music.enabled ? '关闭' : '开启';
    const position = `第 ${g.music.trackIndex + 1} / ${MUSIC_TRACKS.length} 首`;
    const trackSummary = `${position}；当前 ${track.title}；下一首 ${nextTrack.title}`;
    g.els.musicButton.classList.toggle('is-muted', !g.music.enabled);
    g.els.musicButton.classList.toggle('is-active', g.music.playing);
    g.els.musicButton.setAttribute('aria-pressed', String(g.music.enabled));
    g.els.musicButton.setAttribute('aria-label', `${action} MIDI 军乐曲单；${trackSummary}`);
    g.els.musicButton.setAttribute('title', `${action} MIDI 军乐\n${trackSummary}`);
    g.els.nextTrackButton.setAttribute('aria-label', `切换下一首；${trackSummary}`);
    g.els.nextTrackButton.setAttribute('title', trackSummary);
    g.$('#musicTrackCount').textContent = position;
    g.$('#musicCurrentTitle').textContent = track.title;
    g.$('#musicNextTitle').textContent = nextTrack.title;
    g.$('.music-controls').setAttribute('aria-label', `MIDI 军乐控制；${trackSummary}`);
  }

  function upgradeAdvice() {
    if (g.state.wall / g.state.wallMax < .58) return '城墙告急 · 建议优先防御';
    const levels = g.state.equipment;
    const minimum = Math.min(levels.weapon, levels.armor, levels.charm);
    if (levels.weapon === minimum) return '火力临界 · 建议优先攻击';
    if (levels.charm === minimum) return '敌潮过密 · 建议优先攻速';
    return '突破伤害 · 建议优先防御';
  }

  function updateUI() {
    const difficulty = g.difficultyConfig();
    const profile = g.state.waveProfile || g.getWaveProfile(g.state.wave, g.state.difficulty);
    g.$('#difficultyValue').textContent = difficulty.name;
    g.$('#waveValue').textContent = String(g.state.wave).padStart(3, '0');
    g.$('#waveLabel').textContent = '波次';
    g.$('#killValue').textContent = String(g.state.kills).padStart(3, '0');
    g.$('#scoreValue').textContent = String(g.state.score).padStart(5, '0');
    g.$('#emberValue').textContent = `${g.state.emberCharges} / ${g.emberCapacity()}`;
    g.$('#manaValue').textContent = `${g.state.mana} / ${g.manaCapacity()}`;
    g.$('#energyValue').textContent = `${Math.ceil(g.state.shield)} / ${g.shieldCapacity()}`;
    g.$('#forgeValue').textContent = g.state.forge;
    g.$('#pressureTierValue').textContent = `第 ${profile.stage} 阶段${profile.isBossWave ? ' · BOSS' : ''}`;
    g.$('#waveMatchValue').textContent = g.state.waveWords;
    g.$('#waveMatchTarget').textContent = profile.requiredGroups;
    g.$('#powerDelta').textContent = g.state.combatBuff
      ? `${RELICS[g.state.combatBuff.type].name} · 剩余 ${g.state.combatBuff.shots} 发`
      : g.upgradeAdvice();
    g.$('.pressure-status').classList.toggle('is-met', g.state.waveWords >= profile.requiredGroups);
    g.$('#wallValue').textContent = Math.max(0, Math.ceil(g.state.wall));
    g.$('#wallMaxValue').textContent = g.state.wallMax;
    g.$('#shieldRailValue').textContent = Math.ceil(g.state.shield);
    g.$('#wallMeter').style.width = `${Math.max(0, g.state.wall / g.state.wallMax) * 100}%`;
    g.$('#shieldMeter').style.width = `${Math.max(0, g.state.shield / g.shieldCapacity()) * 100}%`;
    g.updateUpgradeTargetUI();
    g.$('#forgeMeter').style.width = `${Math.min(100, g.state.forge / g.state.forgeTarget * 100)}%`;
    g.$('#forgeProgressText').textContent = `${g.state.forge} / ${g.state.forgeTarget}`;
    g.els.volleyButton.disabled = g.state.mana < MANA_CAST_COST || g.state.paused || g.state.gameOver;

    ['weapon', 'armor', 'charm'].forEach((slot) => {
      const level = g.state.equipment[slot];
      g.$(`#${slot}Level`).textContent = level;
      g.$(`#${slot}Name`).textContent = g.equipmentName(slot);
    });
    g.$('#weaponStat').textContent = `攻击 ${g.totalPower()}`;
    g.$('#armorStat').textContent = `减伤 ${g.wallDefense()}%`;
    g.$('#charmStat').textContent = g.charmStatLabel();
    g.updateFieldHud();

    const activeCount = g.state.enemies.length;
    const remaining = g.state.waveQueue + activeCount;
    g.$('#waveState').textContent = remaining > 0
      ? `敌军 ${Math.max(0, g.state.waveTotal - remaining)} / ${g.state.waveTotal} · 每批 ${profile.batchSize}`
      : '区域肃清';
    if (g.state.intermissionUntil) {
      const seconds = Math.max(0, Math.ceil((g.state.intermissionUntil - performance.now()) / 1000));
      g.$('#nextWaveValue').textContent = `${seconds} 秒`;
    } else {
      g.$('#nextWaveValue').textContent = '交战中';
    }
    g.updateTargetDossier();
    g.renderCombatBuff();
    g.refreshContextTooltip();
  }

  function updateTargetDossier() {
    const enteredEnemies = g.state.enemies.filter((enemy) => enemy.entered);
    if (!enteredEnemies.length) {
      g.els.targetDossier.classList.add('is-empty');
      g.els.targetDossier.classList.remove('is-alert');
      g.$('#targetName').textContent = g.state.enemies.length ? '目标尚在场外' : '前线侦察中';
      g.$('#targetRole').textContent = g.state.enemies.length ? `无法锁定 · ${g.state.enemies.length} 个敌军正在进场` : '尚未发现敌军';
      g.$('#targetAttack').textContent = '—';
      g.$('#targetDefense').textContent = '—';
      g.$('#targetHealth').textContent = '—';
      g.$('#targetHealthMeter').style.width = '0%';
      return;
    }
    const target = enteredEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest);
    g.els.targetDossier.classList.remove('is-empty');
    g.els.targetDossier.classList.toggle('is-alert', target.type === 'boss');
    g.$('#targetName').textContent = target.name;
    const statuses = [target.slowUntil > performance.now() ? '霜缚' : '', target.armorBreakUntil > performance.now() ? '破甲' : ''].filter(Boolean);
    g.$('#targetRole').textContent = `${target.role}${statuses.length ? ` · ${statuses.join(' / ')}` : ''}`;
    g.$('#targetAttack').textContent = target.damage;
    g.$('#targetDefense').textContent = g.effectiveDefense(target);
    g.$('#targetHealth').textContent = Math.max(0, Math.ceil(target.hp));
    g.$('#targetHealthMeter').style.width = `${Math.max(0, target.hp / target.maxHp) * 100}%`;
  }

  g.updateFieldHud = updateFieldHud;
  g.setUpgradeMode = setUpgradeMode;
  g.updateCombo = updateCombo;
  g.updateSoundButton = updateSoundButton;
  g.updateMusicButton = updateMusicButton;
  g.upgradeAdvice = upgradeAdvice;
  g.updateUI = updateUI;
  g.updateTargetDossier = updateTargetDossier;
}
