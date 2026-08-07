import { g } from './shared.js';
import {
  SAVE_VERSION, STORAGE_KEYS, DEFAULT_DIFFICULTY, ROWS, COLS, FORGE_START,
  ENEMY_ENTRY_X, TARGET_ACQUIRE_DELAY, TYPES, ENEMY_NAMES, DIFFICULTIES,
  BASE_ENEMY_STATS, RELICS, MAX_SAFE_GAME_INTEGER, MAX_EQUIPMENT_LEVEL
} from './constants.js';
import { readStorage, writeStorage, removeStorage } from './storage.js';
import { safeNumber } from './utils.js';

export function attachSave() {
  function clearSavedProgress() {
    removeStorage(STORAGE_KEYS.progress);
    g.pendingResume = null;
  }

  function readSavedProgress() {
    const raw = readStorage(STORAGE_KEYS.progress);
    if (!raw) return null;
    try {
      const save = JSON.parse(raw);
      const validBoard = Array.isArray(save.board) && save.board.length === ROWS * COLS
        && save.board.every((type) => TYPES.includes(type));
      const validRelics = Array.isArray(save.boardRelics) && save.boardRelics.length === ROWS * COLS
        && save.boardRelics.every((type) => type === null || Boolean(RELICS[type]));
      const migratedDifficulty = save.difficulty === 'rookie' ? DEFAULT_DIFFICULTY : save.difficulty;
      if (save.version !== SAVE_VERSION || !DIFFICULTIES[migratedDifficulty] || !validBoard || !validRelics) throw new Error('Invalid checkpoint');
      return { ...save, difficulty: migratedDifficulty, selectedDifficulty: g.normalizeDifficultyKey(save.selectedDifficulty || migratedDifficulty) };
    } catch (error) {
      g.clearSavedProgress();
      return null;
    }
  }

  function serializeEnemy(enemy, now) {
    return {
      id: enemy.id,
      type: enemy.type,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      speed: enemy.speed,
      damage: enemy.damage,
      defense: enemy.defense,
      relic: enemy.relic,
      x: enemy.x,
      y: enemy.y,
      entered: enemy.entered,
      acquireRemaining: enemy.entered ? Math.max(0, enemy.targetableAt - now) : 0,
      slowRemaining: Math.max(0, enemy.slowUntil - now),
      armorBreakRemaining: Math.max(0, enemy.armorBreakUntil - now)
    };
  }

  function saveProgress(reason = 'manual') {
    if (!g.state.started || g.state.gameOver) return false;
    if (g.state.board.some((type) => !TYPES.includes(type))) {
      g.state.pendingSaveReason = reason;
      return false;
    }
    const now = g.state.paused && g.state.pausedAt ? g.state.pausedAt : performance.now();
    const save = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      reason,
      difficulty: g.state.difficulty,
      selectedDifficulty: g.state.selectedDifficulty,
      board: [...g.state.board],
      boardRelics: [...g.state.boardRelics],
      score: g.state.score,
      kills: g.state.kills,
      wave: g.state.wave,
      emberCharges: g.state.emberCharges,
      mana: g.state.mana,
      shield: g.state.shield,
      repaired: g.state.repaired,
      forge: g.state.forge,
      forgeTarget: g.state.forgeTarget,
      equipment: { ...g.state.equipment },
      upgradeMode: g.state.upgradeMode,
      autoUpgradeIndex: g.state.autoUpgradeIndex,
      wall: g.state.wall,
      wallMax: g.state.wallMax,
      combo: g.state.combo,
      enemyId: g.state.enemyId,
      waveQueue: g.state.waveQueue,
      waveTotal: g.state.waveTotal,
      waveSpawned: g.state.waveSpawned,
      waveBossesRemaining: g.state.waveBossesRemaining,
      enemyRelicsSpawnedThisWave: g.state.enemyRelicsSpawnedThisWave,
      waveMatches: g.state.waveMatches,
      totalMatches: g.state.totalMatches,
      paused: g.state.paused,
      activePlayMs: g.currentActivePlayMs(now),
      resolution: g.state.resolution ? { ...g.state.resolution } : null,
      spawnDelay: Math.max(0, g.state.nextSpawnAt - now),
      attackDelay: Math.max(0, g.state.attackReadyAt - now),
      intermissionRemaining: g.state.intermissionUntil ? Math.max(0, g.state.intermissionUntil - now) : 0,
      combatBuff: g.state.combatBuff ? { ...g.state.combatBuff } : null,
      combatBuffQueue: g.state.combatBuffQueue.map((buff) => ({ ...buff })),
      enemies: g.state.enemies.map((enemy) => g.serializeEnemy(enemy, now))
    };
    const saved = writeStorage(STORAGE_KEYS.progress, JSON.stringify(save));
    if (saved) g.state.pendingSaveReason = null;
    return saved;
  }

  function flushPendingSave() {
    if (!g.state.pendingSaveReason) return;
    const reason = g.state.pendingSaveReason;
    g.state.pendingSaveReason = null;
    g.saveProgress(reason);
  }

  function clearBattleLayers() {
    g.state.enemies.forEach((enemy) => enemy.el?.remove());
    g.state.enemies = [];
    g.els.projectilesLayer.replaceChildren();
    g.els.impactLayer.replaceChildren();
    g.els.toastLayer.replaceChildren();
    g.els.combatBuffs.replaceChildren();
    g.els.combatBuffs.dataset.signature = '';
    g.els.boardEffects.replaceChildren();
    g.els.battleLog.replaceChildren();
  }

  function sanitizeBuff(buff) {
    if (!buff || !RELICS[buff.type]) return null;
    return { type: buff.type, shots: Math.floor(safeNumber(buff.shots, 1, 1, 99)) };
  }

  function restoreEnemy(savedEnemy, now) {
    if (!savedEnemy || !BASE_ENEMY_STATS[savedEnemy.type]) return;
    const stats = BASE_ENEMY_STATS[savedEnemy.type];
    const id = Math.floor(safeNumber(savedEnemy.id, g.state.enemyId + 1, 1, MAX_SAFE_GAME_INTEGER));
    const fallbackName = ENEMY_NAMES[savedEnemy.type][(id + g.state.wave - 2) % ENEMY_NAMES[savedEnemy.type].length];
    const restoredName = ENEMY_NAMES[savedEnemy.type].includes(savedEnemy.name) ? savedEnemy.name : fallbackName;
    const maxHp = safeNumber(savedEnemy.maxHp, stats.hp, 1, MAX_SAFE_GAME_INTEGER);
    const enemy = {
      id,
      type: savedEnemy.type,
      name: restoredName,
      role: stats.role,
      roleIcon: stats.roleIcon,
      hp: safeNumber(savedEnemy.hp, maxHp, 1, maxHp),
      maxHp,
      speed: safeNumber(savedEnemy.speed, stats.speed, .1, MAX_SAFE_GAME_INTEGER),
      damage: Math.round(safeNumber(savedEnemy.damage, stats.damage, 1, MAX_SAFE_GAME_INTEGER)),
      defense: Math.round(safeNumber(savedEnemy.defense, stats.defense, 0, MAX_SAFE_GAME_INTEGER)),
      label: restoredName,
      relic: RELICS[savedEnemy.relic] ? savedEnemy.relic : null,
      entered: Boolean(savedEnemy.entered) || safeNumber(savedEnemy.x, 90) <= ENEMY_ENTRY_X,
      targetableAt: now + safeNumber(savedEnemy.acquireRemaining, TARGET_ACQUIRE_DELAY, 0, TARGET_ACQUIRE_DELAY),
      slowUntil: now + safeNumber(savedEnemy.slowRemaining, 0, 0, 6000),
      armorBreakUntil: now + safeNumber(savedEnemy.armorBreakRemaining, 0, 0, 8000),
      x: safeNumber(savedEnemy.x, 90, 15.1, 110),
      y: safeNumber(savedEnemy.y, 70, 48, 90)
    };
    enemy.el = g.createEnemyElement(enemy);
    g.state.enemies.push(enemy);
    g.state.enemyId = Math.max(g.state.enemyId, enemy.id);
    g.positionEnemy(enemy);
  }

  function showResumePrompt(save) {
    g.pendingResume = save;
    const difficultyKey = g.normalizeDifficultyKey(save.difficulty);
    const difficulty = g.difficultyConfig(difficultyKey);
    const wave = g.normalizeWave(save.wave, difficultyKey);
    g.$('#resumeDifficulty').textContent = difficulty.name;
    g.$('#resumeWave').textContent = g.formatWaveProgress(wave, difficultyKey, true);
    g.$('#resumeWall').textContent = `${Math.ceil(safeNumber(save.wall, 0, 0))} / ${Math.ceil(safeNumber(save.wallMax, 1120, 1))}`;
    g.$('#resumeScore').textContent = String(Math.floor(safeNumber(save.score, 0, 0))).padStart(5, '0');
    g.$('#resumeSavedAt').textContent = new Date(safeNumber(save.savedAt, Date.now())).toLocaleString('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    g.$('#resumeButton span').textContent = `继续第 ${wave} 波`;
    g.els.introModal.classList.remove('is-open');
    g.els.resumeModal.classList.add('is-open');
  }

  function sanitizeResolution(resolution) {
    if (!resolution || !['swap', 'resolve'].includes(resolution.kind)) return null;
    if (resolution.kind === 'resolve') {
      return { kind: 'resolve', phase: ['matching', 'primed', 'burst', 'dropping'].includes(resolution.phase) ? resolution.phase : 'matching' };
    }
    const first = Math.floor(safeNumber(resolution.first, -1, -1, ROWS * COLS - 1));
    const second = Math.floor(safeNumber(resolution.second, -1, -1, ROWS * COLS - 1));
    if (first < 0 || second < 0) return null;
    return { kind: 'swap', phase: resolution.phase === 'reverting' ? 'reverting' : 'validate', first, second };
  }

  async function resumeSavedResolution(savedResolution, sessionId) {
    if (!savedResolution || sessionId !== g.state.sessionId) return;
    g.state.locked = true;
    if (savedResolution.kind === 'swap') {
      if (savedResolution.phase === 'reverting') {
        await g.wait(280);
      } else {
        await g.wait(160);
        if (sessionId !== g.state.sessionId) return;
        const { first, second } = savedResolution;
        [g.state.board[first], g.state.board[second]] = [g.state.board[second], g.state.board[first]];
        [g.state.boardRelics[first], g.state.boardRelics[second]] = [g.state.boardRelics[second], g.state.boardRelics[first]];
        if (g.findMatches().size === 0) {
          [g.state.board[first], g.state.board[second]] = [g.state.board[second], g.state.board[first]];
          [g.state.boardRelics[first], g.state.boardRelics[second]] = [g.state.boardRelics[second], g.state.boardRelics[first]];
          g.revertSwapFlow();
          g.renderBoard(new Set(), second);
          await g.wait(280);
        } else {
          g.startResolveFlow();
          await g.resolveBoard(sessionId);
        }
      }
    } else if (g.findMatches().size > 0) {
      g.restartBoardFlow({ kind: 'resolve', phase: 'matching' });
      await g.resolveBoard(sessionId);
    }
    if (sessionId !== g.state.sessionId) return;
    g.renderBoard();
    g.state.locked = false;
    g.completeBoardFlow();
    g.flushPendingSave();
  }

  function restoreProgress(save = g.pendingResume || g.readSavedProgress()) {
    if (!save) return false;
    const restoredFromPause = Boolean(save.paused);
    cancelAnimationFrame(g.state.animationId);
    g.music.stop();
    g.sound.init();
    g.state.sessionId += 1;
    g.clearGameTasks();
    const sessionId = g.state.sessionId;
    const restoredResolution = g.sanitizeResolution(save.resolution);
    g.state.selected = null;
    g.restartBoardFlow(restoredResolution);
    g.state.locked = Boolean(restoredResolution);
    g.state.started = true;
    g.state.paused = false;
    g.state.gameOver = false;
    g.state.rulesWasPaused = false;
    g.state.leaderboardWasPaused = false;
    g.state.pendingSaveReason = null;
    g.state.settlementRecorded = false;
    g.state.difficulty = g.normalizeDifficultyKey(save.difficulty);
    g.state.selectedDifficulty = g.state.difficulty;
    g.state.board = [...save.board];
    g.state.boardRelics = [...save.boardRelics];
    g.state.score = Math.floor(safeNumber(save.score, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.kills = Math.floor(safeNumber(save.kills, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.wave = g.normalizeWave(save.wave, g.state.difficulty);
    g.state.emberCharges = Math.floor(safeNumber(save.emberCharges, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.mana = Math.floor(safeNumber(save.mana, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.shield = 0;
    g.state.repaired = Math.floor(safeNumber(save.repaired, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.forge = Math.floor(safeNumber(save.forge, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.forgeTarget = FORGE_START;
    g.state.equipment = {
      weapon: Math.floor(safeNumber(save.equipment?.weapon, 1, 1, MAX_EQUIPMENT_LEVEL)),
      armor: Math.floor(safeNumber(save.equipment?.armor, 1, 1, MAX_EQUIPMENT_LEVEL)),
      charm: Math.floor(safeNumber(save.equipment?.charm, 1, 1, MAX_EQUIPMENT_LEVEL))
    };
    g.state.emberCharges = Math.min(g.state.emberCharges, g.emberCapacity());
    g.state.mana = Math.min(g.state.mana, g.manaCapacity());
    g.state.upgradeMode = ['auto', 'weapon', 'armor', 'charm'].includes(save.upgradeMode) ? save.upgradeMode : 'auto';
    g.state.autoUpgradeIndex = Math.floor(safeNumber(save.autoUpgradeIndex, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.syncForgeTarget();
    g.state.wallMax = Math.floor(safeNumber(save.wallMax, 1120, 1, MAX_SAFE_GAME_INTEGER));
    g.state.wall = safeNumber(save.wall, g.state.wallMax, 1, g.state.wallMax);
    g.state.shield = safeNumber(save.shield, 0, 0, g.shieldCapacity());
    g.state.combo = Math.floor(safeNumber(save.combo, 1, 1, 999));
    g.state.enemyId = Math.floor(safeNumber(save.enemyId, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.waveProfile = g.getWaveProfile(g.state.wave, g.state.difficulty);
    g.state.waveQueue = Math.floor(safeNumber(save.waveQueue, g.state.waveProfile.enemyCount, 0, 100000));
    g.state.waveTotal = Math.floor(safeNumber(save.waveTotal, g.state.waveProfile.enemyCount, 1, 100000));
    g.state.waveSpawned = Math.floor(safeNumber(save.waveSpawned, 0, 0, g.state.waveTotal));
    g.state.waveBossesRemaining = Math.floor(safeNumber(save.waveBossesRemaining, g.state.waveProfile.bossCount, 0, 100));
    const savedEnemyRelics = Array.isArray(save.enemies) ? save.enemies.filter((enemy) => RELICS[enemy?.relic]).length : 0;
    g.state.enemyRelicsSpawnedThisWave = Math.floor(safeNumber(
      save.enemyRelicsSpawnedThisWave,
      savedEnemyRelics,
      0,
      g.state.waveProfile.enemyRelicCapPerWave
    ));
    g.state.waveMatches = Math.floor(safeNumber(save.waveMatches, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.totalMatches = Math.floor(safeNumber(save.totalMatches, 0, 0, MAX_SAFE_GAME_INTEGER));
    g.state.activePlayMs = safeNumber(save.activePlayMs, 0, 0, MAX_SAFE_GAME_INTEGER);
    g.state.combatBuff = g.sanitizeBuff(save.combatBuff);
    g.state.combatBuffQueue = Array.isArray(save.combatBuffQueue) ? save.combatBuffQueue.map(g.sanitizeBuff).filter(Boolean) : [];

    g.clearBattleLayers();
    const now = performance.now();
    (Array.isArray(save.enemies) ? save.enemies : []).forEach((enemy) => g.restoreEnemy(enemy, now));
    g.state.nextSpawnAt = now + safeNumber(save.spawnDelay, 450, 0, 60000);
    g.state.attackReadyAt = now + safeNumber(save.attackDelay, 250, 0, 10000);
    const intermissionRemaining = safeNumber(save.intermissionRemaining, 0, 0, 60000);
    g.state.intermissionUntil = intermissionRemaining > 0 ? now + intermissionRemaining : 0;
    g.state.lastFrame = now;
    g.state.lastUiAt = 0;
    g.state.pausedAt = 0;
    g.state.playSegmentStartedAt = now;

    g.renderBoard(new Set(), -1, 'initial');
    g.updateCombo();
    g.selectDifficulty(g.state.difficulty, false);
    g.setUpgradeMode(g.state.upgradeMode, false);
    g.els.resumeModal.classList.remove('is-open');
    g.els.introModal.classList.remove('is-open', 'is-first-visit');
    g.els.rulesModal.classList.remove('is-open');
    g.els.gameOverModal.classList.remove('is-open');
    g.syncPauseUi();
    g.addLog(`已${restoredFromPause ? '从暂停点继续' : '恢复'}第 ${g.state.wave} 波本地战报，棋盘与前线状态同步完成`);
    const restoredTargets = g.state.enemies.filter((enemy) => enemy.entered);
    g.aimTurret(restoredTargets.length ? restoredTargets.reduce((closest, enemy) => enemy.x < closest.x ? enemy : closest) : null);
    g.updateUI();
    g.state.animationId = requestAnimationFrame(g.gameLoop);
    if (g.state.resolution) g.resumeSavedResolution(g.state.resolution, sessionId);
    if (!g.state.paused) {
      g.resumeGameTasks();
      g.music.start();
    }
    g.pendingResume = null;
    return true;
  }

  function discardSavedProgress() {
    g.clearSavedProgress();
    g.els.resumeModal.classList.remove('is-open');
    g.els.introModal.classList.add('is-open', 'is-first-visit');
    g.$('#startButton small').textContent = `部署 · ${DIFFICULTIES[g.state.selectedDifficulty].subtitle}`;
  }

  g.clearSavedProgress = clearSavedProgress;
  g.readSavedProgress = readSavedProgress;
  g.serializeEnemy = serializeEnemy;
  g.saveProgress = saveProgress;
  g.flushPendingSave = flushPendingSave;
  g.clearBattleLayers = clearBattleLayers;
  g.sanitizeBuff = sanitizeBuff;
  g.restoreEnemy = restoreEnemy;
  g.showResumePrompt = showResumePrompt;
  g.sanitizeResolution = sanitizeResolution;
  g.resumeSavedResolution = resumeSavedResolution;
  g.restoreProgress = restoreProgress;
  g.discardSavedProgress = discardSavedProgress;
}
