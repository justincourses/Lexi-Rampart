import { g } from './shared.js';
import {
  EMBER_CAP_PER_WEAPON_LEVEL, MANA_CAP_PER_CHARM_LEVEL, MANA_CAST_COST,
  ARMOR_WALL_BONUS, ARMOR_SHIELD_BONUS, WAVE_INTERMISSION_MS
} from './constants.js';

export function attachTooltip() {
  function tooltipTargetEnemy() {
    const enteredEnemies = g.state.enemies.filter((enemy) => enemy.entered);
    return enteredEnemies.length
      ? enteredEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
      : null;
  }

  function contextTooltipModel(target) {
    const key = target.dataset.tooltipKey;
    const difficulty = g.difficultyConfig();
    const profile = g.state.waveProfile || g.getWaveProfile(g.state.wave, g.state.difficulty);
    const enemy = g.tooltipTargetEnemy();
    const upgradeSlot = g.currentUpgradeSlot();
    const upgradeLabel = g.upgradeSlotLabel(upgradeSlot);
    const remainingEnemies = g.state.waveQueue + g.state.enemies.length;
    const models = {
      campaignOptions: {
        title: '战役选项',
        body: g.state.started
          ? `当前为「${difficulty.name}」难度。打开后会立即暂停并保存；确认出征才会清除本局并重开。`
          : '选择萌新、老兵或大佬难度；所有难度都会持续防守，直到城墙失守。'
      },
      rules: { title: '完整规则', body: '集中查看消除、补强、战斗、彩蛋、难度、排名与存档规则；打开时会暂停并保存。' },
      leaderboard: { title: `本机排行榜 · ${g.settlementHistory.length} 条`, body: '打开总榜或按萌新、老兵、大佬难度查看历史战绩；同一难度优先比较守完波数。' },
      fullscreen: { title: document.fullscreenElement ? '退出全屏' : '进入全屏', body: '切换显示模式，不会改变战局进度或暂停状态。' },
      sound: { title: g.sound.muted ? '音效已关闭' : '音效已开启', body: `点击${g.sound.muted ? '开启' : '关闭'}射击、命中、消除与升级音效；MIDI 军乐单独控制。` },
      pause: {
        title: g.state.paused ? '战局已暂停' : '立即暂停',
        body: g.state.paused ? '点击后从冻结点继续；刷新页面后选择继续也会直接恢复交战。' : '立即冻结敌军、射击、消除连锁和特效，并把当前状态保存到浏览器。'
      },
      difficulty: {
        title: `难度 · ${difficulty.name}`,
        body: `${difficulty.subtitle} · 军功倍率 ×${difficulty.scoreScale}。本波 ${profile.enemyCount} 敌，高阶怪约 ${Math.round(profile.advancedChance * 100)}%。`
      },
      wave: { title: `第 ${g.formatWaveProgress(g.state.wave)} 波`, body: `当前为第 ${profile.stage} 阶段${profile.isBossWave ? ' Boss 波' : ''}；敌军属性每波增强，每 10 波再发生一次跃升。` },
      kills: { title: `本局歼敌 ${g.state.kills}`, body: '成功击败才计入歼敌；抵达城墙并自爆的敌人不会计入。' },
      score: { title: `当前军功 ${g.state.score.toLocaleString('zh-CN')}`, body: '击杀、波次与难度会影响军功；失败结算还会加入守完波次和有效交战时长。' },
      wall: { title: `城墙 ${Math.max(0, Math.ceil(g.state.wall))} / ${g.state.wallMax} · 护盾 ${Math.ceil(g.state.shield)} / ${g.shieldCapacity()}`, body: `敌人伤害先经过城防减伤 ${g.wallDefense()}%，再优先消耗护盾；护盾耗尽后才扣除耐久。` },
      pressure: {
        title: `本波消除 ${g.state.waveMatches} / ${profile.requiredGroups} 组`,
        body: g.state.waveMatches >= profile.requiredGroups ? '本波建议目标已完成；继续消除仍会获得资源和补强。' : `还差 ${profile.requiredGroups - g.state.waveMatches} 组达到建议节奏；这是引导目标，不会扣除已有收益。`
      },
      combo: { title: `当前连锁 ×${g.state.combo}`, body: g.state.combo > 1 ? '连续掉落形成的新消除会提高奥能、防御能量与军功收益。' : '一次交换后若自动形成连续消除，连锁倍率会逐段提高。' },
      ember: { title: `余烬储备 ${g.state.emberCharges} / ${g.emberCapacity()}`, body: `每枚红曜石提供 1 次余烬齐射；下一轮开火消耗 1 次，使整轮伤害提高 25%。攻击每升一级，储备上限 +${EMBER_CAP_PER_WEAPON_LEVEL}。` },
      mana: { title: `奥能 ${g.state.mana} / ${g.manaCapacity()}`, body: g.state.mana >= MANA_CAST_COST ? `奥术齐射已经就绪：每次消耗 ${MANA_CAST_COST} 点；攻速每升一级，奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}。` : `还需 ${MANA_CAST_COST - g.state.mana} 点即可发动奥术齐射；当前上限 ${g.manaCapacity()}，攻速每升一级上限 +${MANA_CAP_PER_CHARM_LEVEL}。` },
      energy: { title: `防御能量 ${Math.ceil(g.state.shield)} / ${g.shieldCapacity()}`, body: `绿晶产生防御能量：获得时先用于修复缺失耐久，剩余能量转化为护盾；能量与护盾上限均为耐久上限的 50%。受到伤害时先扣护盾，再扣城墙耐久。` },
      forge: { title: `可用补强 ${g.state.forge}`, body: `当前目标：${upgradeLabel} LV.${g.state.equipment[upgradeSlot]}→${g.state.equipment[upgradeSlot] + 1}，需要 ${g.state.forgeTarget} 点。切换目标不会损失进度。` },
      waveState: { title: remainingEnemies ? `本波剩余 ${remainingEnemies} 敌` : '本波区域肃清', body: `总计 ${g.state.waveTotal} 敌，每批最多 ${profile.batchSize} 个；场外敌人进场前无法锁定。` },
      allyAttack: { title: `我方攻击 ${g.totalPower()} · 余烬上限 ${g.emberCapacity()}`, body: `主炮弹以该数值为基础，再结算敌方防御；攻击每升一级还会使余烬储备上限 +${EMBER_CAP_PER_WEAPON_LEVEL}。` },
      allyDefense: { title: `城防减伤 ${g.wallDefense()}% · 护盾 ${Math.ceil(g.state.shield)}`, body: `敌人伤害先减免 ${g.wallDefense()}%，再由护盾吸收；每次升级防御还会使耐久上限 +${ARMOR_WALL_BONUS}、护盾上限 +${ARMOR_SHIELD_BONUS}，并同步修复最多 ${ARMOR_WALL_BONUS} 点。` },
      allySpeed: { title: `有效射速 ${g.attackRate()} / 秒 · 奥能上限 ${g.manaCapacity()}`, body: `当前为${g.volleyLabel()}；攻速升级会缩短间隔、增加齐射弹数，并使奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}。` },
      targetDamage: {
        title: enemy ? `目标伤害 ${enemy.damage}` : '目标伤害 —',
        body: enemy ? (() => {
          const damage = Math.max(1, Math.round(enemy.damage * (1 - g.wallDefense() / 100)));
          const absorbed = Math.min(g.state.shield, damage);
          return `抵达终点后结算 ${damage} 点伤害；当前护盾预计吸收 ${Math.round(absorbed)}，耐久损失 ${Math.round(damage - absorbed)}。`;
        })() : '尚无已进场且可锁定的敌人。'
      },
      targetDefense: {
        title: enemy ? `目标防御 ${g.effectiveDefense(enemy)}` : '目标防御 —',
        body: enemy ? `当前约抵消 ${Math.round((1 - 100 / (100 + g.effectiveDefense(enemy) * 2)) * 100)}% 的弩炮伤害；破甲会暂时降低防御。` : '尚无已进场且可锁定的敌人。'
      },
      targetHealth: { title: enemy ? `目标生命 ${Math.max(0, Math.ceil(enemy.hp))} / ${enemy.maxHp}` : '目标生命 —', body: enemy ? '生命归零即被歼灭；若先抵达终点则自爆并从战场移除。' : '尚无已进场且可锁定的敌人。' },
      arcaneVolley: { title: g.state.mana >= MANA_CAST_COST ? '奥术齐射 · 就绪' : `奥术齐射 · ${g.state.mana} / ${MANA_CAST_COST} 奥能`, body: `消耗 ${MANA_CAST_COST} 奥能，对所有已进场敌人造成约 ${Math.round(42 + g.totalPower() * .65)} 点基础伤害；场外敌人不受影响。` },
      nextWave: { title: g.state.intermissionUntil ? `下一波还有 ${Math.max(0, Math.ceil((g.state.intermissionUntil - performance.now()) / 1000))} 秒` : '下一批交战中', body: `本波敌军全部肃清后固定整备 ${WAVE_INTERMISSION_MS / 1000} 秒，再自动开始下一波并保存进度。` },
      forgeProgress: { title: `${upgradeLabel}补强 ${g.state.forge} / ${g.state.forgeTarget}`, body: `升级目标为 LV.${g.state.equipment[upgradeSlot]}→${g.state.equipment[upgradeSlot] + 1}。每个消除组 +1，四连与五连、铸币组会获得额外补强。` },
      weaponLoadout: { title: `${g.equipmentName('weapon')} · LV.${g.state.equipment.weapon}`, body: `当前攻击 ${g.totalPower()}、余烬上限 ${g.emberCapacity()}；每升一级同时提高伤害，并使余烬上限 +${EMBER_CAP_PER_WEAPON_LEVEL}。` },
      armorLoadout: { title: `${g.equipmentName('armor')} · LV.${g.state.equipment.armor}`, body: `当前减伤 ${g.wallDefense()}%，城墙 ${Math.max(0, Math.ceil(g.state.wall))} / ${g.state.wallMax}、护盾上限 ${g.shieldCapacity()}；每升一级使耐久上限 +${ARMOR_WALL_BONUS}、护盾上限 +${ARMOR_SHIELD_BONUS}，并同步修复最多 ${ARMOR_WALL_BONUS} 点。` },
      charmLoadout: { title: `${g.equipmentName('charm')} · LV.${g.state.equipment.charm}`, body: `当前 ${g.attackRate()} 次/秒、${g.volleyLabel()}、奥能上限 ${g.manaCapacity()}；每升一级使奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}。` }
    };

    if (key === 'upgradeStrategy') {
      const mode = target.dataset.upgrade;
      const slot = mode === 'auto' ? g.currentUpgradeSlot('auto') : mode;
      const label = g.upgradeSlotLabel(slot);
      const cost = g.forgeCostFor(slot);
      const bonus = slot === 'armor'
        ? `耐久上限 +${ARMOR_WALL_BONUS}、护盾上限 +${ARMOR_SHIELD_BONUS}`
        : slot === 'weapon' ? `余烬上限 +${EMBER_CAP_PER_WEAPON_LEVEL}` : `奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}`;
      return mode === 'auto'
        ? { title: `自动 · 本次${label}`, body: `本次会把 ${cost} 补强用于${label} LV.${g.state.equipment[slot]}→${g.state.equipment[slot] + 1}，并获得${bonus}；完成后自动重新选择最低等级项目。` }
        : { title: `${label}优先`, body: `切换后持续补强${label}；下一级需要 ${cost} 点并获得${bonus}。当前 ${g.state.forge} 点会完整保留。` };
    }
    return models[key] || { title: '战场提示', body: '移动鼠标查看这个模块的规则与当前状态。' };
  }

  function renderContextTooltipContent() {
    if (!g.contextTooltipTarget?.isConnected) return;
    const model = g.contextTooltipModel(g.contextTooltipTarget);
    g.els.contextTooltipTitle.textContent = model.title;
    g.els.contextTooltipBody.textContent = model.body;
  }

  function positionContextTooltip() {
    if (!g.contextTooltipTarget?.isConnected || !g.els.contextTooltip.classList.contains('is-visible')) return;
    const margin = 10;
    const gap = 10;
    const targetRect = g.contextTooltipTarget.getBoundingClientRect();
    const tooltipRect = g.els.contextTooltip.getBoundingClientRect();
    const placeAbove = targetRect.top >= tooltipRect.height + gap + margin;
    const placement = placeAbove ? 'top' : 'bottom';
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tooltipRect.width - margin, left));
    let top = placeAbove ? targetRect.top - tooltipRect.height - gap : targetRect.bottom + gap;
    top = Math.max(margin, Math.min(window.innerHeight - tooltipRect.height - margin, top));
    const arrowX = Math.max(13, Math.min(tooltipRect.width - 23, targetRect.left + targetRect.width / 2 - left - 5));
    g.els.contextTooltip.dataset.placement = placement;
    g.els.contextTooltip.style.left = `${Math.round(left)}px`;
    g.els.contextTooltip.style.top = `${Math.round(top)}px`;
    g.els.contextTooltip.style.setProperty('--tip-arrow-x', `${Math.round(arrowX)}px`);
  }

  function showContextTooltip(target) {
    if (!target?.dataset.tooltipKey) return;
    if (g.contextTooltipTarget && g.contextTooltipTarget !== target && g.contextTooltipTarget.getAttribute('aria-describedby') === 'contextTooltip') {
      g.contextTooltipTarget.removeAttribute('aria-describedby');
    }
    g.contextTooltipTarget = target;
    g.contextTooltipTarget.setAttribute('aria-describedby', 'contextTooltip');
    g.renderContextTooltipContent();
    g.els.contextTooltip.classList.add('is-visible');
    g.els.contextTooltip.setAttribute('aria-hidden', 'false');
    g.positionContextTooltip();
  }

  function refreshContextTooltip() {
    if (!g.contextTooltipTarget || !g.els.contextTooltip.classList.contains('is-visible')) return;
    g.renderContextTooltipContent();
  }

  function hideContextTooltip() {
    if (g.contextTooltipTarget?.getAttribute('aria-describedby') === 'contextTooltip') g.contextTooltipTarget.removeAttribute('aria-describedby');
    g.contextTooltipTarget = null;
    g.els.contextTooltip.classList.remove('is-visible');
    g.els.contextTooltip.setAttribute('aria-hidden', 'true');
  }

  g.tooltipTargetEnemy = tooltipTargetEnemy;
  g.contextTooltipModel = contextTooltipModel;
  g.renderContextTooltipContent = renderContextTooltipContent;
  g.positionContextTooltip = positionContextTooltip;
  g.showContextTooltip = showContextTooltip;
  g.refreshContextTooltip = refreshContextTooltip;
  g.hideContextTooltip = hideContextTooltip;
}
