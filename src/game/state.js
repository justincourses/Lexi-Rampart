import { g } from './shared.js';
import { FORGE_START, DEFAULT_DIFFICULTY } from './constants.js';

export function attachState() {
  g.state = {
    board: [], boardRelics: [], selected: null, locked: false, started: false, paused: true, gameOver: false,
    score: 0, kills: 0, wave: 1, emberCharges: 0, mana: 0, shield: 0, repaired: 0,
    forge: 0, forgeTarget: FORGE_START, equipment: { weapon: 1, armor: 1, charm: 1 },
    upgradeMode: 'auto', autoUpgradeIndex: 0, selectedDifficulty: DEFAULT_DIFFICULTY, difficulty: DEFAULT_DIFFICULTY,
    wall: 1120, wallMax: 1120, combo: 1, enemies: [], enemyId: 0,
    waveQueue: 0, waveTotal: 0, waveSpawned: 0, waveBossesRemaining: 0, enemyRelicsSpawnedThisWave: 0,
    waveMatches: 0, totalMatches: 0, waveProfile: null, nextSpawnAt: 0, intermissionUntil: 0,
    attackReadyAt: 0, lastFrame: 0, animationId: 0, lastUiAt: 0, sessionId: 0,
    combatBuff: null, combatBuffQueue: [], introWasPaused: false, rulesWasPaused: false, leaderboardWasPaused: false, pendingSaveReason: null,
    resolution: null, pausedAt: 0, activePlayMs: 0, playSegmentStartedAt: 0, settlementRecorded: false
  };
  g.state.spellingRound = null;
  g.state.wordBag = [];
  g.state.runeBag = [];
  g.state.previousHiddenEdge = '';
  g.state.correctStreak = 0;
  g.state.waveWords = 0;
  g.state.totalWords = 0;
  g.pendingResume = null;
  g.settlementHistory = [];
  g.currentSettlementId = null;
  g.activeHistoryFilter = 'all';
  g.rulesReturnFocus = null;
  g.leaderboardReturnFocus = null;
  g.contextTooltipTarget = null;
  g.runeDragGesture = null;
  g.suppressBoardClickUntil = 0;
  g.cascadeSettlementToken = 0;

}
