import { g } from './shared.js';
import { MUSIC_TRACKS } from './music-tracks.js';
import {
  MANA_CAST_COST, DEFAULT_DIFFICULTY, ENEMY_ENTRY_X, ENEMY_NAMES, DIFFICULTIES, RELICS, TYPES
} from './constants.js';
import { safeNumber } from './utils.js';
import { RUNE_REWARD_TYPES } from './spelling-logic.js';

export function attachEvents() {
  g.els.board.addEventListener('click', (event) => {
    const button = event.target.closest('.letter-button');
    if (button) g.handleLetter(button.dataset.letter);
  });
  g.$('#startButton').addEventListener('click', g.resetGame);
  g.$('#resumeButton').addEventListener('click', () => g.restoreProgress());
  g.$('#discardSaveButton').addEventListener('click', g.discardSavedProgress);
  g.$('#restartButton').addEventListener('click', g.resetGame);
  g.$('#introClose').addEventListener('click', g.closeCampaignOptions);
  g.$('#helpButton').addEventListener('click', g.openCampaignOptions);
  g.$('#rulesButton').addEventListener('click', g.openRules);
  g.$('#rulesClose').addEventListener('click', g.closeRules);
  g.els.rulesModal.addEventListener('click', (event) => {
    if (event.target === g.els.rulesModal) g.closeRules();
  });
  g.els.leaderboardButton.addEventListener('click', g.openLeaderboard);
  g.$('#leaderboardClose').addEventListener('click', g.closeLeaderboard);
  g.els.leaderboardModal.addEventListener('click', (event) => {
    if (event.target === g.els.leaderboardModal) g.closeLeaderboard();
  });
  document.querySelectorAll('.difficulty-card').forEach((button) => {
    button.addEventListener('click', () => g.selectDifficulty(button.dataset.difficulty));
  });
  document.querySelectorAll('.strategy-button').forEach((button) => {
    button.addEventListener('click', () => g.setUpgradeMode(button.dataset.upgrade));
  });
  document.querySelectorAll('[data-history-filter]').forEach((button) => {
    button.addEventListener('click', () => g.setHistoryFilter(button.dataset.historyFilter));
  });
  g.els.pauseButton.addEventListener('click', () => g.togglePause());
  g.els.boardResumeButton.addEventListener('click', () => {
    g.els.pauseButton.focus({ preventScroll: true });
    g.togglePause();
  });
  g.els.musicButton.addEventListener('click', () => g.music.toggle());
  g.els.nextTrackButton.addEventListener('click', () => g.music.skip());
  g.els.soundButton.addEventListener('click', () => g.sound.toggle());
  g.els.fullscreenButton.addEventListener('click', g.toggleFullscreen);
  g.els.volleyButton.addEventListener('click', g.castVolley);
  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('[data-tooltip-key]');
    if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
    g.showContextTooltip(target);
  });
  document.addEventListener('pointerout', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('[data-tooltip-key]');
    if (!target || target !== g.contextTooltipTarget || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
    g.hideContextTooltip();
  });
  document.addEventListener('focusin', (event) => {
    if (event.target instanceof Element && event.target.matches('[data-tooltip-key]')) g.showContextTooltip(event.target);
  });
  document.addEventListener('focusout', (event) => {
    if (event.target === g.contextTooltipTarget && !(event.relatedTarget instanceof Node && event.target.contains(event.relatedTarget))) g.hideContextTooltip();
  });
  document.addEventListener('click', g.hideContextTooltip, true);
  document.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.key.toLowerCase() === 'q') {
      event.preventDefault();
      g.castVolley();
    } else if (!event.metaKey && !event.ctrlKey && !event.altKey && /^[a-z]$/i.test(event.key)) {
      if (g.handleLetter(event.key)) event.preventDefault();
    }
    if (event.key === 'Escape' && g.els.leaderboardModal.classList.contains('is-open')) g.closeLeaderboard();
    else if (event.key === 'Escape' && g.els.rulesModal.classList.contains('is-open')) g.closeRules();
    else if (event.key === 'Escape' && g.state.started && g.els.introModal.classList.contains('is-open')) g.closeCampaignOptions();
    else if (event.key === 'Escape' && g.state.started) g.togglePause();
  });
  document.addEventListener('fullscreenchange', g.updateFullscreenButton);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && g.state.started && !g.state.gameOver) g.togglePause(true);
  });
  window.addEventListener('pagehide', () => g.saveProgress('leave'));
  window.addEventListener('resize', g.scheduleGameFit, { passive: true });
  window.addEventListener('resize', g.positionContextTooltip, { passive: true });
  window.addEventListener('scroll', g.positionContextTooltip, { passive: true, capture: true });
  window.addEventListener('orientationchange', g.scheduleGameFit, { passive: true });
  window.addEventListener('load', g.scheduleGameFit, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(g.scheduleGameFit);

  if (new URLSearchParams(window.location.search).has('testMode')) {
    window.__runeRampartTest = {
      grantForge(amount) {
        g.state.forge += Number(amount) || g.state.forgeTarget;
        g.checkForge();
        g.updateUI();
      },
      spellingRound() {
        const round = g.state.spellingRound;
        return round ? { ...round, hiddenIndices: [...round.hiddenIndices], filledIndices: [...round.filledIndices] } : null;
      },
      inputLetter(letter) {
        return g.handleLetter(letter);
      },
      forceWord(word, level = 'A1', hiddenIndices = [1], runeType = 'ember', runeAmount = 1) {
        const normalizedWord = String(word || '').toLowerCase();
        if (!/^[a-z]{3,12}$/.test(normalizedWord)) return false;
        const indices = [...new Set(hiddenIndices.map(Number))].filter((index) => Number.isInteger(index) && index >= 0 && index < normalizedWord.length).slice(0, 3).sort((a, b) => a - b);
        if (!indices.length || normalizedWord.length - indices.length < 2) return false;
        g.state.spellingRound = {
          word: normalizedWord,
          level: String(level).toUpperCase(),
          hiddenIndices: indices,
          filledIndices: [],
          errors: 0,
          status: 'playing',
          runeType: RUNE_REWARD_TYPES.includes(runeType) ? runeType : 'ember',
          runeAmount: Math.max(1, Math.min(3, Math.floor(Number(runeAmount) || 1))),
          lastInput: '',
          lastResult: ''
        };
        g.state.locked = false;
        g.renderSpelling();
        return true;
      },
      nextWord() {
        return { ...g.prepareSpellingRound(), hiddenIndices: [...g.state.spellingRound.hiddenIndices] };
      },
      setEmberCharges(amount = 0) {
        g.state.emberCharges = Math.max(0, Math.min(g.emberCapacity(), Math.floor(Number(amount) || 0)));
        g.updateUI();
      },
      grantMana(amount = 18) {
        g.state.mana = Math.min(g.manaCapacity(), g.state.mana + Math.max(0, Math.floor(Number(amount) || MANA_CAST_COST)));
        g.updateUI();
      },
      reinforcementReward(groups = []) {
        return g.reinforcementReward(groups);
      },
      matchesAfterSwap(first, second) {
        return [...g.findMatchesAfterSwap(Number(first), Number(second))].sort((a, b) => a - b);
      },
      dragState() {
        const drag = g.runeDragGesture;
        return drag ? {
          startIndex: drag.startIndex,
          targetIndex: drag.targetIndex,
          lockedTargetIndex: drag.lockedTargetIndex,
          armed: drag.armed,
          previewProgress: drag.previewProgress
        } : null;
      },
      setBoard(board, boardRelics = []) {
        if (!Array.isArray(board) || board.length !== 49 || !board.every((type) => TYPES.includes(type))) return false;
        const relics = Array.isArray(boardRelics) && boardRelics.length === board.length
          ? boardRelics.map((type) => RELICS[type] ? type : null)
          : board.map(() => null);
        g.state.sessionId += 1;
        g.clearGameTasks();
        g.restartBoardFlow();
        g.clearRuneDrag(true);
        g.state.board = [...board];
        g.state.boardRelics = relics;
        g.state.selected = null;
        g.state.locked = false;
        g.renderBoard();
        return true;
      },
      saveProgress(reason = 'test') {
        g.saveProgress(reason);
        return g.readSavedProgress();
      },
      savedProgress() {
        return g.readSavedProgress();
      },
      animationState() {
        return g.animationRegistrySnapshot();
      },
      boardFlowState() {
        return g.boardFlowSnapshot();
      },
      history() {
        return g.readHistory();
      },
      setHistory(records = []) {
        g.settlementHistory = g.writeHistory(records);
        return g.settlementHistory;
      },
      forceFailure(values = {}) {
        g.state.started = true;
        g.state.gameOver = false;
        g.state.paused = false;
        g.state.pausedAt = 0;
        g.state.settlementRecorded = false;
        g.state.difficulty = DIFFICULTIES[values.difficulty] ? values.difficulty : g.state.difficulty;
        g.state.wave = g.normalizeWave(values.wave, g.state.difficulty, g.state.wave);
        g.state.score = Math.floor(safeNumber(values.score, g.state.score, 0));
        g.state.kills = Math.floor(safeNumber(values.kills, g.state.kills, 0));
        g.state.totalWords = Math.floor(safeNumber(values.totalWords, values.totalMatches ?? g.state.totalWords, 0));
        g.state.repaired = Math.floor(safeNumber(values.repaired, g.state.repaired, 0));
        g.state.activePlayMs = safeNumber(values.activePlayMs, g.state.activePlayMs, 0);
        g.state.playSegmentStartedAt = 0;
        g.endGame();
        return g.readHistory();
      },
      musicState() {
        const track = g.music.currentTrack();
        return {
          enabled: g.music.enabled,
          playing: g.music.playing,
          trackIndex: g.music.trackIndex,
          trackTitle: track.title,
          trackSource: track.source,
          trackCount: MUSIC_TRACKS.length,
          playlist: MUSIC_TRACKS.map(({ title, source, bpm, melody, bass, harmony }) => ({
            title,
            source,
            bpm,
            steps: melody.length,
            voicesAligned: melody.length === bass.length && melody.length === harmony.length
          }))
        };
      },
      advanceMusicTrack() {
        const track = g.music.advanceTrack(true);
        return { trackIndex: g.music.trackIndex, trackTitle: track.title };
      },
      grantRelic(type = 'blast') {
        g.activateRelic(RELICS[type] ? type : 'blast');
        g.updateUI();
      },
      clearRuneRelics() {
        g.state.boardRelics = g.state.board.map(() => null);
        g.renderBoard();
      },
      setRuneRelic(index, type = 'frost') {
        const safeIndex = Math.max(0, Math.min(g.state.board.length - 1, Math.floor(Number(index) || 0)));
        g.state.boardRelics[safeIndex] = RELICS[type] ? type : 'frost';
        g.renderBoard();
      },
      setRelicShots(shots = 1) {
        if (g.state.combatBuff) g.state.combatBuff.shots = Math.max(1, Math.floor(Number(shots) || 1));
        g.renderCombatBuff();
      },
      clearRelics() {
        g.state.combatBuff = null;
        g.state.combatBuffQueue = [];
        g.renderCombatBuff();
        g.updateUI();
      },
      clearEnemies() {
        g.state.enemies.forEach((enemy) => enemy.el.remove());
        g.state.enemies = [];
        g.state.waveQueue = 0;
        g.state.waveSpawned = g.state.waveTotal;
        g.updateUI();
      },
      spawnEnemy(type = 'assault', relic = null) {
        if (!ENEMY_NAMES[type]) return;
        g.state.waveQueue += 1;
        const enemy = g.spawnEnemy(type, RELICS[relic] ? relic : null);
        return enemy ? { id: enemy.id, hp: enemy.hp, name: enemy.name, entered: enemy.entered, x: enemy.x } : null;
      },
      spawnNaturalEnemy() {
        g.state.waveQueue += 1;
        const enemy = g.spawnEnemy();
        return enemy ? { id: enemy.id, type: enemy.type, relic: enemy.relic } : null;
      },
      breachEnemy(type = 'assault') {
        if (!ENEMY_NAMES[type]) return null;
        g.state.wall = g.state.wallMax;
        g.state.waveQueue += 1;
        const enemy = g.spawnEnemy(type, null);
        if (!enemy) return null;
        enemy.x = 15;
        enemy.entered = true;
        enemy.targetableAt = performance.now();
        g.positionEnemy(enemy);
        const wallBefore = g.state.wall;
        const shieldBefore = g.state.shield;
        const baseDamage = enemy.damage;
        const defense = g.wallDefense();
        const expectedDamage = Math.max(1, Math.round(baseDamage * (1 - defense / 100)));
        const expectedShieldAbsorb = Math.min(shieldBefore, expectedDamage);
        const expectedWallDamage = expectedDamage - expectedShieldAbsorb;
        g.enemyBreaches(enemy);
        return {
          id: enemy.id,
          name: enemy.name,
          baseDamage,
          defense,
          expectedDamage,
          expectedShieldAbsorb,
          expectedWallDamage,
          actualShieldAbsorb: shieldBefore - g.state.shield,
          actualWallDamage: wallBefore - g.state.wall,
          wallBefore,
          wallAfter: g.state.wall,
          shieldBefore,
          shieldAfter: g.state.shield,
          removedFromBattle: !g.state.enemies.includes(enemy),
          selfDestructing: enemy.el.classList.contains('is-self-destructing')
        };
      },
      setDefenseState(wall = g.state.wallMax, shield = 0) {
        g.state.wall = safeNumber(wall, g.state.wallMax, 0, g.state.wallMax);
        g.state.shield = safeNumber(shield, 0, 0, g.shieldCapacity());
        g.updateUI();
        return { wall: g.state.wall, wallMax: g.state.wallMax, shield: g.state.shield, shieldMax: g.shieldCapacity() };
      },
      grantMossSupport(amount = 42) {
        const result = g.applyMossSupport(amount);
        g.updateUI();
        return result;
      },
      enterAllEnemies() {
        const now = performance.now();
        g.state.enemies.forEach((enemy) => {
          enemy.x = Math.min(enemy.x, ENEMY_ENTRY_X);
          enemy.entered = true;
          enemy.targetableAt = now;
          g.positionEnemy(enemy);
        });
        g.updateUI();
        return g.state.enemies.map(({ id, name, entered, x }) => ({ id, name, entered, x }));
      },
      waveProfile(wave, difficulty = 'master') {
        return g.getWaveProfile(wave, difficulty);
      },
      difficultySettings(difficulty = g.state.difficulty) {
        return { ...g.difficultyConfig(difficulty) };
      },
      breachDamageProfile(type = 'raider', wave = 1, difficulty = DEFAULT_DIFFICULTY, armorLevel = 1) {
        return g.breachDamageProfile(type, wave, difficulty, armorLevel);
      },
      simulateBalance(difficulty = 'master', efficiency = 1) {
        return g.simulateBalance(difficulty, efficiency);
      },
      setEquipment(slot, level) {
        if (!['weapon', 'armor', 'charm'].includes(slot)) return;
        g.state.equipment[slot] = Math.max(1, Math.floor(Number(level) || 1));
        g.state.emberCharges = Math.min(g.state.emberCharges, g.emberCapacity());
        g.state.mana = Math.min(g.state.mana, g.manaCapacity());
        g.updateUI();
      },
      fireBurst() {
        let target = g.state.enemies[0];
        if (!target) {
          g.state.waveQueue += 1;
          g.spawnEnemy('boss', null);
          [target] = g.state.enemies;
        }
        const volley = g.fireAt(target, performance.now());
        return { volleySize: g.volleySize(), attackRate: g.attackRate(), ...volley, emberCharges: g.state.emberCharges };
      },
      clearWave(wave = g.state.wave) {
        g.startWave(wave);
        g.state.waveQueue = 0;
        g.state.waveBossesRemaining = 0;
        g.state.enemies.forEach((enemy) => enemy.el.remove());
        g.state.enemies = [];
        g.updateUI();
      },
      snapshot() {
        return {
          difficulty: g.state.difficulty,
          selectedDifficulty: g.state.selectedDifficulty,
          started: g.state.started,
          paused: g.state.paused,
          gameOver: g.state.gameOver,
          locked: g.state.locked,
          resolution: g.state.resolution ? { ...g.state.resolution } : null,
          activePlayMs: g.currentActivePlayMs(),
          scheduledTasks: g.gameTasks.size,
          upgradeMode: g.state.upgradeMode,
          upgradeTargetSlot: g.currentUpgradeSlot(),
          wave: g.state.wave,
          waveLimit: g.waveLimitForDifficulty(),
          infinite: g.isEndlessDifficulty(),
          endless: g.isEndlessDifficulty(),
          intermissionRemaining: g.state.intermissionUntil ? Math.max(0, g.state.intermissionUntil - performance.now()) : 0,
          score: g.state.score,
          kills: g.state.kills,
          wall: g.state.wall,
          wallMax: g.state.wallMax,
          shield: g.state.shield,
          shieldMax: g.shieldCapacity(),
          waveMatches: g.state.waveMatches,
          totalMatches: g.state.totalMatches,
          waveWords: g.state.waveWords,
          totalWords: g.state.totalWords,
          correctStreak: g.state.correctStreak,
          spellingRound: g.state.spellingRound ? {
            ...g.state.spellingRound,
            hiddenIndices: [...g.state.spellingRound.hiddenIndices],
            filledIndices: [...g.state.spellingRound.filledIndices]
          } : null,
          waveProfile: g.state.waveProfile,
          enemyRelicsSpawnedThisWave: g.state.enemyRelicsSpawnedThisWave,
          combatBuff: g.state.combatBuff ? { ...g.state.combatBuff } : null,
          combatBuffQueue: g.state.combatBuffQueue.map((buff) => ({ ...buff })),
          runeRelics: [...g.state.boardRelics],
          emberCharges: g.state.emberCharges,
          emberCapacity: g.emberCapacity(),
          mana: g.state.mana,
          manaCapacity: g.manaCapacity(),
          repaired: g.state.repaired,
          forge: g.state.forge,
          forgeTarget: g.state.forgeTarget,
          equipment: { ...g.state.equipment },
          board: [...g.state.board],
          enemies: g.state.enemies.map(({ type, role, relic }) => ({ type, role, relic }))
        };
      }
    };
  }

}
