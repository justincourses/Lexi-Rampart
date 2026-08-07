import { g } from './shared.js';
import {
  DIFFICULTIES, DIFFICULTY_PRIORITY,
  HISTORY_LIMIT, HISTORY_VISIBLE_LIMIT, STORAGE_KEYS, DEFAULT_DIFFICULTY,
  MAX_SAFE_GAME_INTEGER
} from './constants.js';
import { readStorage, writeStorage } from './storage.js';
import { safeNumber, formatBattleTime } from './utils.js';
import * as combatMath from './combat-math.js';

export function attachHistory() {
  function normalizeDifficultyKey(key) {
    return combatMath.normalizeDifficultyKey(key, DEFAULT_DIFFICULTY);
  }

  function difficultyConfig(key = g.state.difficulty) {
    return combatMath.difficultyConfig(key);
  }

  function waveLimitForDifficulty(key = g.state.difficulty) {
    return combatMath.waveLimitForDifficulty(key);
  }

  function isEndlessDifficulty(key = g.state.difficulty) {
    return combatMath.isEndlessDifficulty(key);
  }

  function normalizeWave(value, difficultyKey = g.state.difficulty, fallback = 1) {
    return combatMath.normalizeWave(value, difficultyKey, fallback);
  }

  function formatWaveProgress(wave, difficultyKey = g.state.difficulty, pad = false) {
    return combatMath.formatWaveProgress(wave, difficultyKey, pad);
  }

  function currentActivePlayMs(now = performance.now()) {
    const currentSegment = g.state.started && !g.state.paused && !g.state.gameOver && g.state.playSegmentStartedAt
      ? Math.max(0, now - g.state.playSegmentStartedAt)
      : 0;
    return Math.max(0, g.state.activePlayMs + currentSegment);
  }

  function closePlaySegment(now = performance.now()) {
    g.state.activePlayMs = g.currentActivePlayMs(now);
    g.state.playSegmentStartedAt = 0;
  }


  function settlementTimeScore(activePlayMs) {
    const seconds = Math.floor(Math.max(0, activePlayMs) / 1000);
    return seconds * 2;
  }

  function normalizeHistoryRecord(record, index = 0) {
    if (!record) return null;
    const difficulty = record.difficulty === 'rookie' ? DEFAULT_DIFFICULTY : record.difficulty;
    if (!DIFFICULTIES[difficulty]) return null;
    const achievedAt = Math.floor(safeNumber(record.achievedAt, Date.now(), 1));
    const activePlayMs = Math.floor(safeNumber(record.activePlayMs, 0, 0, MAX_SAFE_GAME_INTEGER));
    const clearedWaves = Math.floor(safeNumber(record.clearedWaves, 0, 0, g.waveLimitForDifficulty(difficulty)));
    // Preserve the flag on old 100-wave records, but never infer a new victory:
    // all current modes end only when the wall falls.
    const victory = Boolean(record.victory);
    const legacyScore = safeNumber(record.score, 0, 0, MAX_SAFE_GAME_INTEGER);
    const baseScore = Math.floor(safeNumber(record.baseScore, legacyScore, 0, MAX_SAFE_GAME_INTEGER));
    const waveScore = Math.floor(safeNumber(record.waveScore, Math.min(MAX_SAFE_GAME_INTEGER, clearedWaves * 1500), 0, MAX_SAFE_GAME_INTEGER));
    const timeScore = Math.floor(safeNumber(record.timeScore, g.settlementTimeScore(activePlayMs), 0, MAX_SAFE_GAME_INTEGER));
    return {
      id: String(record.id || `${achievedAt}-${index}`),
      achievedAt,
      difficulty,
      victory,
      clearedWaves,
      activePlayMs,
      baseScore,
      waveScore,
      timeScore,
      settlementScore: Math.floor(safeNumber(record.settlementScore, Math.min(MAX_SAFE_GAME_INTEGER, baseScore + waveScore + timeScore), 0, MAX_SAFE_GAME_INTEGER)),
      kills: Math.floor(safeNumber(record.kills, 0, 0, MAX_SAFE_GAME_INTEGER)),
      totalWords: Math.floor(safeNumber(record.totalWords, record.totalMatches ?? 0, 0, MAX_SAFE_GAME_INTEGER)),
      totalMatches: Math.floor(safeNumber(record.totalMatches, record.totalWords ?? 0, 0, MAX_SAFE_GAME_INTEGER)),
      repaired: Math.floor(safeNumber(record.repaired, 0, 0, MAX_SAFE_GAME_INTEGER))
    };
  }

  function sortHistory(records) {
    return [...records].sort((first, second) => (
      DIFFICULTY_PRIORITY[second.difficulty] - DIFFICULTY_PRIORITY[first.difficulty]
      || second.clearedWaves - first.clearedWaves
      || second.settlementScore - first.settlementScore
      || second.kills - first.kills
      || second.totalWords - first.totalWords
      || first.achievedAt - second.achievedAt
    ));
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(readStorage(STORAGE_KEYS.history, '[]'));
      if (!Array.isArray(parsed)) return [];
      return g.sortHistory(parsed.map(g.normalizeHistoryRecord).filter(Boolean)).slice(0, HISTORY_LIMIT);
    } catch (error) {
      return [];
    }
  }

  function writeHistory(records) {
    const normalized = g.sortHistory((Array.isArray(records) ? records : []).map(g.normalizeHistoryRecord).filter(Boolean)).slice(0, HISTORY_LIMIT);
    writeStorage(STORAGE_KEYS.history, JSON.stringify(normalized));
    return normalized;
  }

  function createSettlementRecord() {
    const activePlayMs = Math.floor(g.currentActivePlayMs());
    const clearedWaves = Math.max(0, g.state.wave - 1);
    const waveScore = Math.min(MAX_SAFE_GAME_INTEGER, clearedWaves * 1500);
    const timeScore = g.settlementTimeScore(activePlayMs);
    const achievedAt = Date.now();
    return g.normalizeHistoryRecord({
      id: `${achievedAt}-${Math.random().toString(36).slice(2, 8)}`,
      achievedAt,
      difficulty: g.state.difficulty,
      victory: false,
      clearedWaves,
      activePlayMs,
      baseScore: g.state.score,
      waveScore,
      timeScore,
      settlementScore: Math.min(MAX_SAFE_GAME_INTEGER, g.state.score + waveScore + timeScore),
      kills: g.state.kills,
      totalWords: g.state.totalWords,
      repaired: g.state.repaired
    });
  }

  function recordSettlement() {
    if (g.state.settlementRecorded) return null;
    g.state.settlementRecorded = true;
    const record = g.createSettlementRecord();
    const history = g.writeHistory([...readHistory(), record]);
    return { record, history, rank: history.findIndex((item) => item.id === record.id) + 1 };
  }

  function mountHistoryBoard(slot) {
    const board = g.$('#historyBoard');
    const target = typeof slot === 'string' ? g.$(slot) : slot;
    if (board && target && board.parentElement !== target) target.appendChild(board);
  }

  function renderHistory(history = g.settlementHistory, currentId = g.currentSettlementId) {
    const rows = g.$('#historyRows');
    if (!rows) return;
    const visibleHistory = g.activeHistoryFilter === 'all'
      ? history
      : history.filter((record) => record.difficulty === g.activeHistoryFilter);
    rows.replaceChildren();
    visibleHistory.slice(0, HISTORY_VISIBLE_LIMIT).forEach((record, index) => {
      const row = document.createElement('tr');
      if (record.id === currentId) row.classList.add('is-current');
      const date = new Date(record.achievedAt).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const values = [
        `#${String(index + 1).padStart(2, '0')}`,
        DIFFICULTIES[record.difficulty].name,
        `${record.clearedWaves} 波`,
        record.settlementScore.toLocaleString('zh-CN'),
        String(record.kills),
        formatBattleTime(record.activePlayMs),
        date
      ];
      values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      rows.appendChild(row);
    });
    if (!visibleHistory.length) {
      const row = document.createElement('tr');
      row.className = 'history-empty-row';
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.textContent = g.activeHistoryFilter === 'all' ? '还没有战报，完成一局后会自动记录。' : `还没有「${DIFFICULTIES[g.activeHistoryFilter].name}」难度的战报。`;
      row.appendChild(cell);
      rows.appendChild(row);
    }
    document.querySelectorAll('[data-history-filter]').forEach((button) => {
      const active = button.dataset.historyFilter === g.activeHistoryFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const count = g.$('#historyCount');
    if (count) count.textContent = `${visibleHistory.length} 条战报`;
  }

  function setHistoryFilter(filter = 'all') {
    g.activeHistoryFilter = filter === 'all' || DIFFICULTIES[filter] ? filter : 'all';
    g.renderHistory();
  }

  function renderFailureSettlement(result) {
    if (!result) return;
    const { record, history, rank } = result;
    g.$('#finalDifficulty').textContent = DIFFICULTIES[record.difficulty].name;
    g.$('#finalWave').textContent = g.formatWaveProgress(record.clearedWaves, record.difficulty);
    g.$('#finalKills').textContent = record.kills;
    g.$('#finalMatches').textContent = record.totalWords;
    g.$('#finalTime').textContent = formatBattleTime(record.activePlayMs);
    g.$('#finalScore').textContent = record.settlementScore.toLocaleString('zh-CN');
    g.$('#finalRank').textContent = `#${String(rank).padStart(2, '0')}`;
    g.$('#finalScoreBreakdown').textContent = `基础军功 ${record.baseScore.toLocaleString('zh-CN')} + 波次 ${record.waveScore.toLocaleString('zh-CN')} + 坚守时间 ${record.timeScore.toLocaleString('zh-CN')}`;
    g.settlementHistory = history;
    g.currentSettlementId = record.id;
    g.activeHistoryFilter = 'all';
    g.mountHistoryBoard('#failureHistorySlot');
    g.renderHistory();
  }

  g.normalizeDifficultyKey = normalizeDifficultyKey;
  g.difficultyConfig = difficultyConfig;
  g.waveLimitForDifficulty = waveLimitForDifficulty;
  g.isEndlessDifficulty = isEndlessDifficulty;
  g.normalizeWave = normalizeWave;
  g.formatWaveProgress = formatWaveProgress;
  g.currentActivePlayMs = currentActivePlayMs;
  g.closePlaySegment = closePlaySegment;
  g.settlementTimeScore = settlementTimeScore;
  g.normalizeHistoryRecord = normalizeHistoryRecord;
  g.sortHistory = sortHistory;
  g.readHistory = readHistory;
  g.writeHistory = writeHistory;
  g.createSettlementRecord = createSettlementRecord;
  g.recordSettlement = recordSettlement;
  g.mountHistoryBoard = mountHistoryBoard;
  g.renderHistory = renderHistory;
  g.setHistoryFilter = setHistoryFilter;
  g.renderFailureSettlement = renderFailureSettlement;
}
