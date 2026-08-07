import { g } from './shared.js';
import {
  STORAGE_KEYS, DIFFICULTIES, DEFAULT_DIFFICULTY, FORGE_START, ARMOR_WALL_BONUS
} from './constants.js';
import { writeStorage } from './storage.js';
import { MUSIC_TRACKS } from './music-tracks.js';

export function attachUi() {
  function syncPauseUi(status = '') {
    const paused = g.state.paused;
    g.els.pauseButton.querySelector('span').textContent = paused ? '▶' : 'Ⅱ';
    g.els.pauseButton.setAttribute('aria-label', paused ? '继续游戏' : '暂停游戏');
    g.els.boardLock.classList.toggle('is-visible', paused);
    g.els.boardLock.setAttribute('aria-hidden', String(!paused));
    g.els.boardLockStatus.textContent = status || (paused ? '战局暂停 · 战报已保存' : '战局暂停');
    g.els.boardResumeButton.disabled = !paused;
    g.els.gameShell.classList.toggle('is-paused', paused);
  }

  function showCombatToast(text, tone, x = 50, y = 50) {
    const toast = document.createElement('span');
    toast.className = `combat-toast ${tone}`;
    toast.textContent = text;
    toast.style.left = `${Math.max(5, Math.min(90, x))}%`;
    toast.style.top = `${Math.max(10, Math.min(85, y))}%`;
    g.els.toastLayer.appendChild(toast);
    g.scheduleGameTask(() => toast.remove(), 900);
  }

  function addLog(message) {
    const line = document.createElement('p');
    line.innerHTML = `<span>军情</span> ${message}`;
    g.els.battleLog.prepend(line);
    while (g.els.battleLog.children.length > 3) g.els.battleLog.lastElementChild.remove();
  }

  function togglePause(force) {
    if (!g.state.started || g.state.gameOver) return;
    const manual = typeof force !== 'boolean';
    if (manual) g.sound.play('click', .16, g.state.paused ? 1.12 : .88);
    const nextPaused = typeof force === 'boolean' ? force : !g.state.paused;
    if (nextPaused === g.state.paused) return;
    const now = performance.now();
    if (nextPaused) {
      g.clearRuneDrag(true);
      g.closePlaySegment(now);
      g.state.paused = true;
      g.state.pausedAt = now;
      g.pauseGameTasks(now);
    } else {
      const pausedDuration = g.state.pausedAt ? Math.max(0, now - g.state.pausedAt) : 0;
      if (pausedDuration) {
        if (g.state.nextSpawnAt) g.state.nextSpawnAt += pausedDuration;
        if (g.state.attackReadyAt) g.state.attackReadyAt += pausedDuration;
        if (g.state.intermissionUntil) g.state.intermissionUntil += pausedDuration;
        g.state.enemies.forEach((enemy) => {
          if (enemy.targetableAt) enemy.targetableAt += pausedDuration;
          if (enemy.slowUntil) enemy.slowUntil += pausedDuration;
          if (enemy.armorBreakUntil) enemy.armorBreakUntil += pausedDuration;
        });
      }
      g.state.paused = false;
      g.state.pausedAt = 0;
      g.state.playSegmentStartedAt = now;
      g.state.lastFrame = now;
      g.resumeGameTasks();
      g.checkForge();
    }
    g.syncPauseUi();
    if (g.state.paused) {
      const saved = g.saveProgress('pause');
      g.music.stop();
      if (manual && !saved) g.syncPauseUi('战局暂停 · 正在保存');
    } else {
      g.music.start();
    }
    g.updateUI();
    if (g.state.paused && manual) g.els.boardResumeButton.focus({ preventScroll: true });
  }

  function resetGame() {
    cancelAnimationFrame(g.state.animationId);
    g.clearRuneDrag(true);
    g.music.stop();
    g.sound.init();
    g.clearSavedProgress();
    g.state.sessionId += 1;
    g.clearGameTasks();
    g.restartBoardFlow();
    g.resetCascadeSettlement();
    g.state.selected = null; g.state.locked = false; g.state.started = true; g.state.paused = false; g.state.gameOver = false;
    g.state.pausedAt = 0; g.state.activePlayMs = 0; g.state.settlementRecorded = false; g.state.rulesWasPaused = false; g.state.leaderboardWasPaused = false;
    g.state.difficulty = g.state.selectedDifficulty;
    g.state.score = 0; g.state.kills = 0; g.state.wave = 1; g.state.emberCharges = 0; g.state.mana = 0; g.state.shield = 0; g.state.repaired = 0;
    g.state.forge = 0; g.state.forgeTarget = FORGE_START; g.state.equipment = { weapon: 1, armor: 1, charm: 1 };
    g.state.upgradeMode = 'auto'; g.state.autoUpgradeIndex = 0; g.state.combatBuff = null; g.state.combatBuffQueue = [];
    g.state.wallMax = 1120; g.state.wall = 1120; g.state.combo = 1; g.state.enemyId = 0;
    g.state.waveQueue = 0; g.state.waveTotal = 0; g.state.waveSpawned = 0; g.state.waveBossesRemaining = 0; g.state.enemyRelicsSpawnedThisWave = 0;
    g.state.waveMatches = 0; g.state.totalMatches = 0; g.state.waveProfile = null; g.state.intermissionUntil = 0;
    g.state.attackReadyAt = 0; g.state.lastFrame = performance.now(); g.state.playSegmentStartedAt = g.state.lastFrame; g.state.lastUiAt = 0; g.state.pendingSaveReason = null;
    g.clearBattleLayers();
    g.buildBoard();
    g.renderBoard(new Set(), -1, 'initial');
    g.updateCombo();
    g.els.gameOverModal.classList.remove('is-open');
    g.els.resumeModal.classList.remove('is-open');
    g.els.rulesModal.classList.remove('is-open');
    g.els.leaderboardModal.classList.remove('is-open');
    g.els.introModal.classList.remove('is-open');
    g.els.introModal.classList.remove('is-first-visit');
    g.syncPauseUi();
    g.setUpgradeMode('auto', false);
    g.sound.play('click', .24, 1.2);
    g.startWave(1);
    g.updateUI();
    g.state.animationId = requestAnimationFrame(g.gameLoop);
    g.music.start();
  }

  function endGame() {
    if (g.state.gameOver) return;
    const now = performance.now();
    g.closePlaySegment(now);
    g.state.sessionId += 1;
    g.state.gameOver = true;
    g.state.paused = true;
    g.state.pausedAt = now;
    g.state.wall = 0;
    g.clearGameTasks();
    g.restartBoardFlow();
    g.els.gameShell.classList.add('is-paused');
    g.music.stop();
    g.clearSavedProgress();
    g.renderFailureSettlement(g.recordSettlement());
    g.els.gameOverModal.classList.add('is-open');
    g.sound.tone(164, .38, 'sawtooth', .04);
    g.sound.tone(116, .52, 'sawtooth', .035, .24);
    g.sound.tone(73, .7, 'sine', .04, .52);
    g.updateUI();
  }

  function returnToBriefing() {
    cancelAnimationFrame(g.state.animationId);
    g.clearRuneDrag(true);
    g.music.stop();
    g.clearSavedProgress();
    g.state.sessionId += 1;
    g.clearGameTasks();
    g.restartBoardFlow();
    g.state.started = false;
    g.state.paused = true;
    g.state.gameOver = false;
    g.state.rulesWasPaused = false;
    g.state.leaderboardWasPaused = false;
    g.state.playSegmentStartedAt = 0;
    g.els.gameShell.classList.remove('is-paused');
    g.els.gameOverModal.classList.remove('is-open');
    g.els.rulesModal.classList.remove('is-open');
    g.els.leaderboardModal.classList.remove('is-open');
    g.els.introModal.classList.add('is-open', 'is-first-visit');
    g.$('#startButton small').textContent = `部署 · ${DIFFICULTIES[g.state.selectedDifficulty].subtitle}`;
  }

  function selectDifficulty(key, announce = true) {
    const normalizedKey = g.normalizeDifficultyKey(key);
    if (!DIFFICULTIES[normalizedKey]) return;
    g.state.selectedDifficulty = normalizedKey;
    writeStorage(STORAGE_KEYS.difficulty, normalizedKey);
    document.querySelectorAll('.difficulty-card').forEach((button) => {
      const active = button.dataset.difficulty === normalizedKey;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const config = DIFFICULTIES[normalizedKey];
    g.$('#startButton span').textContent = `以「${config.name}」出征`;
    g.$('#startButton small').textContent = g.state.started ? '确认后重开战局' : `部署 · ${config.subtitle}`;
    if (announce) g.sound.play('click', .12, normalizedKey === 'master' ? .86 : normalizedKey === 'endless' ? .76 : 1.08);
  }

  function openCampaignOptions() {
    g.state.introWasPaused = g.state.paused;
    if (g.state.started && !g.state.gameOver) g.togglePause(true);
    g.els.introModal.classList.remove('is-first-visit');
    g.$('#startButton small').textContent = '确认后重开战局';
    g.els.introModal.classList.add('is-open');
  }

  function closeCampaignOptions() {
    if (!g.state.started) return;
    g.els.introModal.classList.remove('is-open');
    if (!g.state.gameOver && !g.state.introWasPaused) g.togglePause(false);
  }

  function openRules() {
    if (g.els.rulesModal.classList.contains('is-open')) return;
    g.rulesReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    g.state.rulesWasPaused = g.state.paused;
    if (g.state.started && !g.state.gameOver) g.togglePause(true);
    g.els.rulesModal.classList.add('is-open');
    window.setTimeout(() => g.$('#rulesClose').focus({ preventScroll: true }), 120);
  }

  function closeRules() {
    if (!g.els.rulesModal.classList.contains('is-open')) return;
    g.els.rulesModal.classList.remove('is-open');
    if (g.state.started && !g.state.gameOver && !g.state.rulesWasPaused) g.togglePause(false);
    if (g.rulesReturnFocus?.isConnected) g.rulesReturnFocus.focus();
    g.rulesReturnFocus = null;
  }

  function openLeaderboard() {
    if (g.els.leaderboardModal.classList.contains('is-open')) return;
    g.leaderboardReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    g.state.leaderboardWasPaused = g.state.paused;
    if (g.state.started && !g.state.gameOver) g.togglePause(true);
    g.settlementHistory = g.readHistory();
    g.currentSettlementId = null;
    g.activeHistoryFilter = 'all';
    g.mountHistoryBoard('#leaderboardHistorySlot');
    g.renderHistory();
    g.els.leaderboardModal.classList.add('is-open');
    window.setTimeout(() => g.$('#leaderboardClose').focus({ preventScroll: true }), 120);
  }

  function closeLeaderboard() {
    if (!g.els.leaderboardModal.classList.contains('is-open')) return;
    g.els.leaderboardModal.classList.remove('is-open');
    if (g.state.started && !g.state.gameOver && !g.state.leaderboardWasPaused) g.togglePause(false);
    if (g.leaderboardReturnFocus?.isConnected) g.leaderboardReturnFocus.focus();
    g.leaderboardReturnFocus = null;
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      g.addLog('当前浏览器未允许全屏显示');
    }
  }

  function updateFullscreenButton() {
    const active = Boolean(document.fullscreenElement);
    g.els.fullscreenButton.querySelector('span').textContent = active ? '⤡' : '⤢';
    g.els.fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '进入全屏');
    g.els.fullscreenButton.removeAttribute('title');
    g.els.fullscreenButton.classList.toggle('is-active', active);
    g.scheduleGameFit();
  }

  g.showCombatToast = showCombatToast;
  g.addLog = addLog;
  g.togglePause = togglePause;
  g.syncPauseUi = syncPauseUi;
  g.resetGame = resetGame;
  g.endGame = endGame;
  g.returnToBriefing = returnToBriefing;
  g.selectDifficulty = selectDifficulty;
  g.openCampaignOptions = openCampaignOptions;
  g.closeCampaignOptions = closeCampaignOptions;
  g.openRules = openRules;
  g.closeRules = closeRules;
  g.openLeaderboard = openLeaderboard;
  g.closeLeaderboard = closeLeaderboard;
  g.toggleFullscreen = toggleFullscreen;
  g.updateFullscreenButton = updateFullscreenButton;
}
