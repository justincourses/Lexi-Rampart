import { g } from './shared.js';

export function attachDom() {
  g.$ = (selector) => document.querySelector(selector);
  const $ = g.$;
  g.els = {
    gameViewport: $('#gameViewport'),
    gameShell: $('#gameShell'),
    orientationGuard: $('#orientationGuard'),
    board: $('#spellingBoard'),
    boardLock: $('#boardLock'),
    boardLockStatus: $('#boardLockStatus'),
    boardResumeButton: $('#boardResumeButton'),
    battlefield: $('#battlefield'),
    enemiesLayer: $('#enemiesLayer'),
    projectilesLayer: $('#projectilesLayer'),
    impactLayer: $('#impactEffectsLayer'),
    toastLayer: $('#combatToastLayer'),
    combatBuffs: $('#combatBuffs'),
    fortress: $('#fortress'),
    battleLog: $('#battleLog'),
    waveAnnouncement: $('#waveAnnouncement'),
    introModal: $('#introModal'),
    resumeModal: $('#resumeModal'),
    rulesModal: $('#rulesModal'),
    leaderboardModal: $('#leaderboardModal'),
    gameOverModal: $('#gameOverModal'),
    leaderboardButton: $('#leaderboardButton'),
    pauseButton: $('#pauseButton'),
    fullscreenButton: $('#fullscreenButton'),
    musicButton: $('#musicButton'),
    nextTrackButton: $('#nextTrackButton'),
    soundButton: $('#soundButton'),
    boardEffects: $('#boardEffects'),
    cascadeCallout: $('#cascadeCallout'),
    targetDossier: $('#targetDossier'),
    upgradeBanner: $('#equipmentUpgradeBanner'),
    volleyButton: $('#volleyButton'),
    contextTooltip: $('#contextTooltip'),
    contextTooltipTitle: $('#contextTooltipTitle'),
    contextTooltipBody: $('#contextTooltipBody')
  };

}
