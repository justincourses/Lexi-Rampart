import { g } from './shared.js';
import {
  ENEMY_ENTRY_X, TARGET_ACQUIRE_DELAY, ENEMY_NAMES, BASE_ENEMY_STATS, RELICS,
  MANA_CAST_COST, EMBER_DAMAGE_MULTIPLIER, SECONDARY_BOLT_POWER, WAVE_INTERMISSION_MS,
  DIFFICULTIES
} from './constants.js';
import { clamp } from './utils.js';

export function attachCombat() {
  function startWave(wave) {
    g.state.wave = g.normalizeWave(wave, g.state.difficulty);
    const profile = g.getWaveProfile(g.state.wave, g.state.difficulty);
    g.state.waveProfile = profile;
    g.state.waveTotal = profile.enemyCount;
    g.state.waveQueue = g.state.waveTotal;
    g.state.waveSpawned = 0;
    g.state.waveBossesRemaining = profile.bossCount;
    g.state.enemyRelicsSpawnedThisWave = 0;
    g.state.waveMatches = 0;
    g.state.nextSpawnAt = performance.now() + 700;
    g.state.intermissionUntil = 0;
    g.$('#threatText').textContent = profile.isBossWave
      ? `${profile.bossCount} 头 Boss 级攻城兽正在逼近`
      : `第 ${g.state.wave} 波敌军正在逼近`;
    const announcement = g.els.waveAnnouncement;
    announcement.querySelector('span').textContent = `WAVE ${g.formatWaveProgress(g.state.wave, g.state.difficulty, true)}`;
    announcement.querySelector('strong').textContent = profile.isBossWave ? '十波首领战' : g.state.wave < 3 ? '斥候来袭' : '敌潮升级';
    announcement.classList.remove('is-visible');
    void announcement.offsetWidth;
    announcement.classList.add('is-visible');
    g.addLog(`第 ${g.state.wave} 波：${g.state.waveTotal} 个目标，每批 ${profile.batchSize} 个，建议完成 ${profile.requiredGroups} 组消除`);
    g.sound.tone(196, .22, 'triangle', .028);
    g.sound.tone(294, .28, 'triangle', .032, .15);
    g.updateUI();
    g.saveProgress('wave');
  }

  function createEnemyElement(enemy) {
    const el = document.createElement('div');
    el.className = `enemy ${enemy.type}${enemy.relic ? ` relic-carrier relic-${enemy.relic}` : ''}`;
    el.dataset.id = enemy.id;
    el.innerHTML = `<div class="enemy-hp"><span></span></div><span class="enemy-role-mark" aria-hidden="true">${enemy.roleIcon}</span><div class="enemy-body"><i class="horns"></i></div>${enemy.relic ? `<span class="relic-mark" title="携带${RELICS[enemy.relic].name}">${RELICS[enemy.relic].icon}</span>` : ''}<span class="enemy-stats-mini"><b>伤 ${enemy.damage}</b><b>防 ${enemy.defense}</b></span><span class="enemy-label">${enemy.name}</span>`;
    g.els.enemiesLayer.appendChild(el);
    return el;
  }

  function spawnEnemy(forcedType = null, forcedRelic) {
    if (g.state.waveQueue <= 0) return;
    const profile = g.state.waveProfile || g.getWaveProfile(g.state.wave, g.state.difficulty);
    const scheduledBoss = !forcedType && g.state.waveBossesRemaining > 0 && g.state.waveQueue <= g.state.waveBossesRemaining;
    const isBoss = forcedType === 'boss' || scheduledBoss;
    const roll = Math.random();
    let type = forcedType || 'raider';
    if (scheduledBoss) type = 'boss';
    else if (!forcedType && roll < profile.advancedChance) {
      const classRoll = Math.random();
      const bruteWeight = Math.min(.42, .28 + profile.tier * .014);
      type = classRoll < .34 ? 'swift' : classRoll < 1 - bruteWeight ? 'assault' : 'brute';
    }
    const stats = BASE_ENEMY_STATS[type];
    const enemyId = ++g.state.enemyId;
    const names = ENEMY_NAMES[type];
    const name = names[(enemyId + g.state.wave - 2) % names.length];
    const hp = Math.round(stats.hp * profile.hpScale);
    const relicTypes = Object.keys(RELICS);
    let relic = forcedRelic !== undefined && RELICS[forcedRelic] ? forcedRelic : null;
    if (forcedRelic === undefined
      && !isBoss
      && g.state.enemyRelicsSpawnedThisWave < profile.enemyRelicCapPerWave
      && Math.random() < profile.enemyRelicChance) {
      relic = relicTypes[(enemyId + g.state.wave) % relicTypes.length];
      g.state.enemyRelicsSpawnedThisWave += 1;
    }
    const enemy = {
      id: enemyId, type, name, role: stats.role, roleIcon: stats.roleIcon, hp, maxHp: hp,
      speed: stats.speed * profile.speedScale,
      damage: Math.round(stats.damage * profile.damageScale),
      defense: Math.round(stats.defense * profile.defenseScale), label: name,
      relic, entered: false, targetableAt: Infinity, slowUntil: 0, armorBreakUntil: 0,
      x: 105 + Math.random() * 4, y: 60 + Math.random() * 23
    };
    enemy.el = g.createEnemyElement(enemy);
    g.state.enemies.push(enemy);
    g.positionEnemy(enemy);
    g.state.waveQueue -= 1;
    if (scheduledBoss) g.state.waveBossesRemaining -= 1;
    g.state.waveSpawned += 1;
    g.updateUI();
    return enemy;
  }

  function positionEnemy(enemy) {
    const now = performance.now();
    enemy.el.classList.toggle('is-slowed', enemy.slowUntil > now);
    enemy.el.classList.toggle('is-shattered', enemy.armorBreakUntil > now);
    enemy.el.style.left = `${enemy.x}%`;
    enemy.el.style.top = `${enemy.y}%`;
    enemy.el.querySelector('.enemy-hp span').style.width = `${Math.max(0, enemy.hp / enemy.maxHp) * 100}%`;
  }

  function effectiveDefense(enemy) {
    return Math.max(0, Math.round(enemy.defense * (enemy.armorBreakUntil > performance.now() ? .55 : 1)));
  }

  function battlefieldAnchor(selector, fallbackX, fallbackY, container = g.els.battlefield) {
    const anchor = g.$(selector);
    if (!anchor) return { x: fallbackX, y: fallbackY };
    const fieldRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const scale = g.currentGameScale();
    return {
      x: (anchorRect.left + anchorRect.width / 2 - fieldRect.left) / scale,
      y: (anchorRect.top + anchorRect.height / 2 - fieldRect.top) / scale
    };
  }

  function aimTurret(enemy) {
    if (!enemy) {
      g.els.fortress.style.setProperty('--aim-angle', '-0.08rad');
      return;
    }
    const fieldRect = g.els.battlefield.getBoundingClientRect();
    const scale = g.currentGameScale();
    const fieldWidth = fieldRect.width / scale;
    const fieldHeight = fieldRect.height / scale;
    const pivot = g.battlefieldAnchor('.turret-pivot', fieldWidth * .12, fieldHeight * .42);
    const enemyRect = enemy.el.getBoundingClientRect();
    const endX = (enemyRect.left + enemyRect.width / 2 - fieldRect.left) / scale;
    const endY = (enemyRect.top + enemyRect.height * .55 - fieldRect.top) / scale;
    g.els.fortress.style.setProperty('--aim-angle', `${Math.atan2(endY - pivot.y, endX - pivot.x)}rad`);
  }

  function fireAt(enemy, now) {
    if (!enemy || enemy.hp <= 0) return;
    g.state.attackReadyAt = now + g.attackDelay();
    const shots = g.volleySize();
    const emberCharged = g.state.emberCharges > 0;
    if (emberCharged) {
      g.state.emberCharges -= 1;
      g.pulseResource('ember', '-1', 'spend');
      g.showCombatToast('余烬齐射 ×1.25', 'damage', 24, 38);
      g.updateUI();
    }
    const targets = [...g.state.enemies].sort((first, second) => first.x - second.x);
    g.els.fortress.classList.add('is-firing');
    g.els.fortress.classList.toggle('is-ember-firing', emberCharged);
    g.scheduleGameTask(() => g.els.fortress.classList.remove('is-firing'), 190);
    if (emberCharged) g.scheduleGameTask(() => g.els.fortress.classList.remove('is-ember-firing'), 240);

    const combatBuffs = [];
    for (let index = 0; index < shots; index += 1) {
      const target = targets[Math.min(index, targets.length - 1)] || enemy;
      // Every projectile independently reserves one effect use at launch. It
      // keeps that effect through impact even if the live queue advances.
      const combatBuff = g.consumeCombatBuffUse();
      combatBuffs.push(combatBuff);
      const crit = Math.random() < .05 + g.state.equipment.charm * .012;
      const powerScale = index === 0 ? 1 : SECONDARY_BOLT_POWER;
      const damage = Math.round(g.totalPower() * powerScale * (emberCharged ? EMBER_DAMAGE_MULTIPLIER : 1) * (crit ? 1.85 : 1));
      g.launchProjectile(target, damage, crit, now, index, shots, emberCharged, combatBuff);
    }
    return { shots, emberCharged, combatBuffs: combatBuffs.map((buff) => buff ? { ...buff } : null) };
  }

  function launchProjectile(enemy, damage, crit, now, shotIndex = 0, shotCount = 1, emberCharged = false, combatBuff = null) {
    g.sound.tone(690 + shotIndex * 42 + Math.random() * 60, .055, 'sawtooth', .012);
    const fieldRect = g.els.projectilesLayer.getBoundingClientRect();
    const scale = g.currentGameScale();
    const fieldWidth = fieldRect.width / scale;
    const fieldHeight = fieldRect.height / scale;
    const muzzle = g.battlefieldAnchor('.muzzle-anchor', fieldWidth * .19, fieldHeight * .42, g.els.projectilesLayer);
    const startX = muzzle.x;
    const fanOffset = (shotIndex - (shotCount - 1) / 2) * 9;
    const startY = muzzle.y;
    const enemyRect = enemy.el.getBoundingClientRect();
    const initialEndX = (enemyRect.left + enemyRect.width / 2 - fieldRect.left) / scale;
    const initialDistance = Math.abs(initialEndX - startX);
    const travelTime = Math.min(460, Math.max(160, initialDistance / 1.2));
    const speedScale = enemy.slowUntil > now ? .55 : 1;
    const predictedTravel = fieldWidth * enemy.speed * speedScale * travelTime / 100000;
    const endX = Math.max(fieldWidth * .15, initialEndX - predictedTravel);
    const endY = (enemyRect.top + enemyRect.height * .55 - fieldRect.top) / scale + fanOffset * .18;
    const dx = endX - startX;
    const dy = endY - startY;
    const projectile = document.createElement('i');
    projectile.className = `projectile${shotIndex > 0 ? ' is-volley-secondary' : ''}${emberCharged ? ' is-ember-charged' : ''}${combatBuff ? ` is-${combatBuff.type}` : ''}`;
    projectile.dataset.volley = `${shotIndex + 1}/${shotCount}`;
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;
    projectile.style.setProperty('--dx', `${dx}px`);
    projectile.style.setProperty('--dy', `${dy}px`);
    projectile.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
    projectile.style.setProperty('--duration', `${travelTime / 1000}s`);
    projectile.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    g.els.projectilesLayer.appendChild(projectile);

    const sessionId = g.state.sessionId;
    if (g.usesMotionAnimations()) {
      projectile.classList.add('is-motion-driven');
      const angle = Math.atan2(dy, dx);
      const initialTransform = `translate(0px, 0px) rotate(${angle}rad)`;
      const animation = g.playGameAnimation(projectile, {
        transform: [initialTransform, `translate(${dx}px, ${dy}px) rotate(${angle}rad)`],
        opacity: [1, .2]
      }, {
        durationMs: travelTime,
        ease: 'linear',
        sessionId,
        preserveDuration: true,
        reducedMotionKeyframes: { transform: [initialTransform, initialTransform], opacity: [0, 0] },
        cleanup: () => projectile.remove()
      });
      void animation.finished.then(({ status }) => {
        if (status !== 'finished' || sessionId !== g.state.sessionId || !g.state.enemies.includes(enemy) || g.state.gameOver) return;
        g.damageEnemy(enemy, damage, crit, { combatBuff });
      });
      return;
    }
    g.scheduleGameTask(() => {
      projectile.remove();
      if (sessionId !== g.state.sessionId || !g.state.enemies.includes(enemy) || g.state.gameOver) return;
      g.damageEnemy(enemy, damage, crit, { combatBuff });
    }, travelTime);
  }

  function damageEnemy(enemy, damage, crit = false, options = {}) {
    if (!g.state.enemies.includes(enemy)) return;
    const activeBuff = !options.secondary ? options.combatBuff : null;
    const mitigatedDamage = Math.max(1, Math.round(damage * (100 / (100 + g.effectiveDefense(enemy) * 2))));
    enemy.hp -= mitigatedDamage;
    g.sound.play('hit', crit ? .13 : .065, crit ? 1.15 : .95 + Math.random() * .12);
    enemy.el.classList.remove('is-hit');
    void enemy.el.offsetWidth;
    enemy.el.classList.add('is-hit');
    g.positionEnemy(enemy);
    g.createImpactEffect(enemy.x, enemy.y, options.effect || (crit ? 'critical' : 'basic'));
    g.showCombatToast(`${crit ? '暴击 ' : ''}-${mitigatedDamage}`, 'damage', enemy.x, enemy.y);
    if (enemy.hp <= 0) g.killEnemy(enemy);
    if (activeBuff) g.applyCombatBuff(activeBuff, enemy, damage);
  }

  function applyCombatBuff(buff, enemy, damage) {
    if (buff.type === 'blast') {
      g.createImpactEffect(enemy.x, enemy.y, 'blast');
      [...g.state.enemies]
        .filter((candidate) => candidate !== enemy && Math.abs(candidate.x - enemy.x) < 14 && Math.abs(candidate.y - enemy.y) < 18)
        .forEach((candidate) => g.damageEnemy(candidate, Math.round(damage * .48), false, { secondary: true, effect: 'blast' }));
    }
    if (buff.type === 'frost' && g.state.enemies.includes(enemy)) {
      enemy.slowUntil = performance.now() + 4500;
      enemy.el.classList.add('is-slowed');
      g.createImpactEffect(enemy.x, enemy.y, 'frost');
    }
    if (buff.type === 'shatter' && g.state.enemies.includes(enemy)) {
      enemy.armorBreakUntil = performance.now() + 6000;
      enemy.el.classList.add('is-shattered');
      g.createImpactEffect(enemy.x, enemy.y, 'shatter');
    }
  }

  function consumeCombatBuffUse() {
    const buff = g.state.combatBuff;
    if (!buff) return null;
    const use = { type: buff.type };
    buff.shots -= 1;
    if (buff.shots <= 0) {
      const nextBuff = g.state.combatBuffQueue.shift() || null;
      g.state.combatBuff = nextBuff;
      if (nextBuff) g.addLog(`${RELICS[buff.type].name}效果结束，队列中的${RELICS[nextBuff.type].name}开始生效`);
      else g.addLog(`${RELICS[buff.type].name}能量耗尽，弩炮恢复常规射击`);
    }
    g.renderCombatBuff();
    return use;
  }

  function createImpactEffect(x, y, type = 'basic') {
    const impact = document.createElement('span');
    impact.className = `impact-flash ${type}`;
    impact.style.left = `${x}%`;
    impact.style.top = `${y}%`;
    impact.innerHTML = '<i></i><i></i><i></i><i></i>';
    g.els.impactLayer.appendChild(impact);
    g.scheduleGameTask(() => impact.remove(), 720);
  }

  function activateRelic(type, source = 'enemy') {
    if (!RELICS[type]) return;
    const shots = { blast: 7, frost: 10, shatter: 9 }[type];
    const buff = { type, shots };
    const queued = Boolean(g.state.combatBuff);
    if (queued) g.state.combatBuffQueue.push(buff);
    else g.state.combatBuff = buff;
    const relic = RELICS[type];
    const sourceLabel = source === 'board' ? '彩蛋符石消除' : '彩蛋怪掉落';
    g.addLog(`${sourceLabel}${relic.name}：${queued ? `进入队列，前方 ${g.state.combatBuffQueue.length - 1} 项` : relic.description}`);
    g.showCombatToast(`${relic.icon} ${relic.name}`, type === 'frost' ? 'mana' : type === 'shatter' ? 'repair' : 'forge', 54, 30);
    g.sound.tone(type === 'frost' ? 520 : type === 'shatter' ? 260 : 148, .34, 'triangle', .045);
    g.renderCombatBuff();
  }

  function renderCombatBuff() {
    const signature = g.state.combatBuff
      ? `${g.state.combatBuff.type}:${g.state.combatBuff.shots}:${g.state.combatBuffQueue.map((buff) => buff.type).join(',')}`
      : 'none';
    if (g.els.combatBuffs.dataset.signature === signature) return;
    g.els.combatBuffs.dataset.signature = signature;
    if (!g.state.combatBuff) {
      g.els.combatBuffs.replaceChildren();
      return;
    }
    const relic = RELICS[g.state.combatBuff.type];
    const chip = document.createElement('span');
    chip.className = `combat-buff ${relic.className}`;
    chip.innerHTML = `<i>${relic.icon}</i><b>${relic.name}</b><small>${g.state.combatBuff.shots} 发</small><em>${g.state.combatBuffQueue.length ? `候命 ${g.state.combatBuffQueue.length}` : '生效中'}</em>`;
    g.els.combatBuffs.replaceChildren(chip);
  }

  function killEnemy(enemy) {
    const position = g.state.enemies.indexOf(enemy);
    if (position < 0) return;
    g.state.enemies.splice(position, 1);
    enemy.el.classList.add('is-dead');
    g.scheduleGameTask(() => enemy.el.remove(), 360);
    g.state.kills += 1;
    const baseScore = enemy.type === 'boss' ? 800 : enemy.type === 'brute' ? 110 : enemy.type === 'assault' ? 90 : enemy.type === 'swift' ? 75 : 55;
    g.state.score += Math.round(baseScore * DIFFICULTIES[g.state.difficulty].scoreScale);
    if (enemy.relic) g.activateRelic(enemy.relic);
    if (enemy.type === 'boss') {
      g.state.forge += 8;
      g.pulseResource('coin', '+8');
      g.pulseForgeMeter();
      g.showCombatToast('Boss 补强 +8', 'forge', enemy.x, enemy.y);
      g.checkForge();
      g.addLog('攻城巨兽倒下，获得 8 点额外补强');
    }
    g.updateUI();
  }

  function enemyBreaches(enemy) {
    const position = g.state.enemies.indexOf(enemy);
    if (position < 0) return;
    g.state.enemies.splice(position, 1);
    enemy.el.classList.add('is-self-destructing');
    g.scheduleGameTask(() => enemy.el.remove(), 440);
    const defense = g.wallDefense();
    const damage = Math.max(1, Math.round(enemy.damage * (1 - defense / 100)));
    const shieldAbsorbed = Math.min(g.state.shield, damage);
    g.state.shield -= shieldAbsorbed;
    const wallDamage = damage - shieldAbsorbed;
    g.state.wall -= wallDamage;
    g.createImpactEffect(Math.max(13, enemy.x), enemy.y, 'self-destruct');
    g.sound.play('wall', .52, enemy.type === 'boss' ? .62 : .8);
    g.sound.tone(enemy.type === 'boss' ? 46 : 64, .42, 'sawtooth', .052);
    g.sound.tone(enemy.type === 'boss' ? 78 : 106, .26, 'square', .034, .06);
    g.els.fortress.classList.remove('is-hit', 'is-breached', 'is-shielded');
    void g.els.fortress.offsetWidth;
    g.els.fortress.classList.add(wallDamage ? 'is-breached' : 'is-shielded');
    if (shieldAbsorbed) g.showCombatToast(`护盾 -${Math.round(shieldAbsorbed)}`, 'shield', 22, 43);
    if (wallDamage) g.showCombatToast(`耐久 -${Math.round(wallDamage)}`, 'damage', 18, 53);
    g.addLog(`${enemy.label}抵达终点后自爆：减伤后 ${damage} 点，护盾吸收 ${Math.round(shieldAbsorbed)}，耐久损失 ${Math.round(wallDamage)}`);
    g.updateUI();
    if (g.state.wall <= 0) g.endGame();
  }

  function castVolley() {
    if (g.state.mana < MANA_CAST_COST || g.state.paused || g.state.gameOver) return;
    g.state.mana -= MANA_CAST_COST;
    g.pulseResource('mana', `-${MANA_CAST_COST}`, 'spend');
    g.showCombatToast(`奥能 -${MANA_CAST_COST}`, 'mana', 39, 24);
    g.sound.tone(220, .35, 'sine', .045);
    g.sound.tone(440, .38, 'triangle', .04, .08);
    g.sound.tone(660, .42, 'sine', .035, .16);
    const wave = document.createElement('div');
    wave.className = 'arcane-wave';
    g.els.battlefield.appendChild(wave);
    g.scheduleGameTask(() => wave.remove(), 600);
    const damage = Math.round(42 + g.totalPower() * .65);
    g.state.enemies.filter((enemy) => enemy.entered)
      .forEach((enemy) => g.damageEnemy(enemy, damage, false, { secondary: true, effect: 'arcane' }));
    g.addLog(`奥术齐射覆盖战场，每个目标受到 ${damage} 点伤害`);
    g.updateUI();
  }

  function gameLoop(now) {
    if (!g.state.started || g.state.gameOver) return;
    const delta = Math.min(40, now - (g.state.lastFrame || now)) / 1000;
    g.state.lastFrame = now;
    if (!g.state.paused) {
      if (g.state.waveQueue > 0 && now >= g.state.nextSpawnAt) {
        const profile = g.state.waveProfile || g.getWaveProfile(g.state.wave, g.state.difficulty);
        const batch = Math.min(profile.batchSize, g.state.waveQueue);
        for (let index = 0; index < batch; index += 1) g.spawnEnemy();
        g.state.nextSpawnAt = now + profile.spawnInterval;
      }
      [...g.state.enemies].forEach((enemy) => {
        const speedScale = enemy.slowUntil > now ? .55 : 1;
        enemy.x -= enemy.speed * speedScale * delta;
        if (!enemy.entered && enemy.x <= ENEMY_ENTRY_X) {
          enemy.entered = true;
          enemy.targetableAt = now + TARGET_ACQUIRE_DELAY;
          g.updateUI();
        }
        if (enemy.x <= 15) g.enemyBreaches(enemy);
        else g.positionEnemy(enemy);
      });
      const enteredEnemies = g.state.enemies.filter((enemy) => enemy.entered);
      const target = enteredEnemies.length
        ? enteredEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
        : null;
      const targetableEnemies = enteredEnemies.filter((enemy) => now >= enemy.targetableAt);
      const firingTarget = targetableEnemies.length
        ? targetableEnemies.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest)
        : null;
      g.aimTurret(firingTarget || target);
      if (firingTarget && now >= g.state.attackReadyAt) {
        g.fireAt(firingTarget, now);
      }
      if (g.state.waveQueue === 0 && g.state.enemies.length === 0) {
        if (!g.state.intermissionUntil) {
          g.state.intermissionUntil = now + WAVE_INTERMISSION_MS;
          g.state.score += Math.round(150 * g.state.wave * DIFFICULTIES[g.state.difficulty].scoreScale);
          const matchResult = g.state.waveMatches >= g.state.waveProfile.requiredGroups ? '补强达标' : '补强不足';
          g.addLog(`第 ${g.state.wave} 波肃清，${matchResult}（${g.state.waveMatches}/${g.state.waveProfile.requiredGroups} 组）`);
        } else if (now >= g.state.intermissionUntil) {
          g.startWave(g.state.wave + 1);
        }
      }
      if (now - g.state.lastUiAt > 100) {
        g.updateUI();
        g.state.lastUiAt = now;
      }
    }
    g.state.animationId = requestAnimationFrame(g.gameLoop);
  }

  g.startWave = startWave;
  g.createEnemyElement = createEnemyElement;
  g.spawnEnemy = spawnEnemy;
  g.positionEnemy = positionEnemy;
  g.effectiveDefense = effectiveDefense;
  g.battlefieldAnchor = battlefieldAnchor;
  g.aimTurret = aimTurret;
  g.fireAt = fireAt;
  g.launchProjectile = launchProjectile;
  g.damageEnemy = damageEnemy;
  g.applyCombatBuff = applyCombatBuff;
  g.consumeCombatBuffUse = consumeCombatBuffUse;
  g.createImpactEffect = createImpactEffect;
  g.activateRelic = activateRelic;
  g.renderCombatBuff = renderCombatBuff;
  g.killEnemy = killEnemy;
  g.enemyBreaches = enemyBreaches;
  g.castVolley = castVolley;
  g.gameLoop = gameLoop;
}
