import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_PATH || (fs.existsSync(defaultChromePath) ? defaultChromePath : undefined);
const expectedDriver = process.env.ANIMATION_DRIVER === 'css' ? 'css' : 'motion';
const fixedBoard = [
  'ember', 'coin', 'mana', 'coin', 'mana', 'moss', 'ember',
  'coin', 'coin', 'ember', 'moss', 'ember', 'coin', 'coin',
  'ember', 'moss', 'mana', 'coin', 'coin', 'moss', 'mana',
  'moss', 'moss', 'ember', 'mana', 'ember', 'coin', 'ember',
  'ember', 'mana', 'mana', 'coin', 'mana', 'moss', 'mana',
  'coin', 'ember', 'ember', 'coin', 'coin', 'mana', 'mana',
  'mana', 'coin', 'ember', 'ember', 'mana', 'ember', 'ember'
];

function findMatches(board) {
  const matches = new Set();
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const index = row * 7 + col;
      if (board[index] === board[index + 1] && board[index] === board[index + 2]) {
        matches.add(index); matches.add(index + 1); matches.add(index + 2);
      }
    }
  }
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row < 5; row += 1) {
      const index = row * 7 + col;
      if (board[index] === board[index + 7] && board[index] === board[index + 14]) {
        matches.add(index); matches.add(index + 7); matches.add(index + 14);
      }
    }
  }
  return matches;
}

let browser;
try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const infinitePage = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await infinitePage.goto(`http://127.0.0.1:4173/?testMode=1${expectedDriver === 'css' ? '&animationDriver=css' : ''}`, { waitUntil: 'networkidle' });
  const infiniteConfiguration = await infinitePage.evaluate(() => {
    const test = window.__runeRampartTest;
    return ['veteran', 'master', 'endless'].map((difficulty) => ({
      difficulty,
      infinite: test.difficultySettings(difficulty).infinite,
      wave100: test.waveProfile(100, difficulty),
      wave101: test.waveProfile(101, difficulty)
    }));
  });
  if (infiniteConfiguration.some(({ infinite, wave100, wave101 }) => !infinite
    || wave100.wave !== 100
    || wave101.wave !== 101
    || !(wave101.hpScale > wave100.hpScale))) {
    throw new Error(`A difficulty still stops scaling at wave 100: ${JSON.stringify(infiniteConfiguration)}`);
  }
  await infinitePage.locator('#startButton').click();
  await infinitePage.evaluate(() => window.__runeRampartTest.clearWave(100));
  await infinitePage.waitForTimeout(150);
  const infiniteRuntime = await infinitePage.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    waveLabel: document.querySelector('#waveLabel').textContent,
    waveValue: document.querySelector('#waveValue').textContent,
    victoryModalExists: Boolean(document.querySelector('#victoryModal'))
  }));
  if (infiniteRuntime.snapshot.gameOver
    || !infiniteRuntime.snapshot.infinite
    || infiniteRuntime.snapshot.intermissionRemaining < 2700
    || infiniteRuntime.waveLabel !== '波次'
    || infiniteRuntime.waveValue !== '100'
    || infiniteRuntime.victoryModalExists) {
    throw new Error(`Wave 100 did not continue as infinite defense: ${JSON.stringify(infiniteRuntime)}`);
  }
  await infinitePage.evaluate(() => window.__runeRampartTest.clearWave(101));
  await infinitePage.waitForTimeout(150);
  const wave101Runtime = await infinitePage.evaluate(() => window.__runeRampartTest.snapshot());
  if (wave101Runtime.gameOver || wave101Runtime.wave !== 101 || wave101Runtime.waveProfile.wave !== 101) {
    throw new Error(`Runtime cannot continue to wave 101: ${JSON.stringify(wave101Runtime)}`);
  }
  await infinitePage.evaluate(() => window.__runeRampartTest.setEquipment('weapon', 150));
  await infinitePage.locator('#pauseButton').click();
  const longRunSave = await infinitePage.evaluate(() => window.__runeRampartTest.savedProgress());
  if (longRunSave?.wave !== 101 || longRunSave?.equipment?.weapon !== 150) {
    throw new Error(`Infinite-defense progress was truncated before reload: ${JSON.stringify(longRunSave)}`);
  }
  await infinitePage.reload({ waitUntil: 'domcontentloaded' });
  await infinitePage.locator('#resumeButton').waitFor({ state: 'visible', timeout: 5000 });
  if (await infinitePage.locator('#resumeWave').innerText() !== '101') {
    throw new Error(`Resume summary still shows a total wave count: ${await infinitePage.locator('#resumeWave').innerText()}`);
  }
  await infinitePage.locator('#resumeButton').click();
  await infinitePage.locator('#pauseButton').click();
  const restoredLongRun = await infinitePage.evaluate(() => window.__runeRampartTest.snapshot());
  if (restoredLongRun.wave !== 101 || restoredLongRun.equipment.weapon !== 150) {
    throw new Error(`Infinite-defense save was truncated after reload: ${JSON.stringify(restoredLongRun)}`);
  }
  const cascadeVisibility = await infinitePage.evaluate(() => {
    const callout = document.querySelector('#cascadeCallout');
    const board = document.querySelector('#matchBoard');
    callout.classList.add('is-visible');
    const activeStyle = getComputedStyle(callout);
    const activeBackground = activeStyle.backgroundColor;
    const activeRect = callout.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    callout.classList.add('is-complete');
    const completeBackground = getComputedStyle(callout).backgroundImage;
    callout.classList.remove('is-visible', 'is-complete');
    const alpha = Number(activeBackground.match(/[\d.]+(?=\))/)?.[0] || 1);
    return {
      activeBackground,
      activeAlpha: alpha,
      completeBackground,
      backdropFilter: activeStyle.backdropFilter,
      coverage: activeRect.width * activeRect.height / (boardRect.width * boardRect.height)
    };
  });
  if (cascadeVisibility.activeAlpha > .55
    || !cascadeVisibility.completeBackground.includes('0.58')
    || !['none', ''].includes(cascadeVisibility.backdropFilter)
    || cascadeVisibility.coverage > .35) {
    throw new Error(`Cascade settlement obscures the board: ${JSON.stringify(cascadeVisibility)}`);
  }
  const enemyRelicProfiles = await infinitePage.evaluate(() => {
    const test = window.__runeRampartTest;
    return Object.fromEntries(['veteran', 'endless', 'master'].map((difficulty) => {
      const profile = test.waveProfile(100, difficulty);
      return [difficulty, {
        chance: profile.enemyRelicChance,
        cap: profile.enemyRelicCapPerWave,
        boardChance: profile.runeRelicChance
      }];
    }));
  });
  if (enemyRelicProfiles.veteran.cap !== 3
    || enemyRelicProfiles.endless.cap !== 1
    || enemyRelicProfiles.master.cap !== 0
    || !(enemyRelicProfiles.veteran.chance > enemyRelicProfiles.endless.chance
      && enemyRelicProfiles.endless.chance > enemyRelicProfiles.master.chance)
    || enemyRelicProfiles.veteran.boardChance !== .02
    || enemyRelicProfiles.endless.boardChance !== .014
    || enemyRelicProfiles.master.boardChance !== .006) {
    throw new Error(`Enemy and board relic profiles are not separated correctly: ${JSON.stringify(enemyRelicProfiles)}`);
  }
  const cappedEnemyRelics = await infinitePage.evaluate(() => {
    const test = window.__runeRampartTest;
    test.clearWave(7);
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
      const spawned = Array.from({ length: 8 }, () => test.spawnNaturalEnemy());
      return { spawned, snapshot: test.snapshot() };
    } finally {
      Math.random = originalRandom;
    }
  });
  if (cappedEnemyRelics.spawned.filter((enemy) => enemy?.relic).length !== 3
    || cappedEnemyRelics.snapshot.enemyRelicsSpawnedThisWave !== 3) {
    throw new Error(`Rookie enemy relics exceeded the per-wave hard cap: ${JSON.stringify(cappedEnemyRelics)}`);
  }
  const queuedRelicBeforeVolley = await infinitePage.evaluate(() => {
    const test = window.__runeRampartTest;
    test.clearEnemies();
    test.clearRelics();
    test.setEquipment('weapon', 1);
    test.setEquipment('charm', 7);
    test.spawnEnemy('boss');
    test.enterAllEnemies();
    test.grantRelic('frost');
    test.grantRelic('shatter');
    test.grantRelic('blast');
    test.setRelicShots(1);
    return test.snapshot();
  });
  const queuedRelicAtLaunch = await infinitePage.evaluate(() => {
    document.querySelector('#pauseButton').click();
    const volley = window.__runeRampartTest.fireBurst();
    return {
      volley,
      snapshot: window.__runeRampartTest.snapshot(),
      projectileEffects: [...document.querySelectorAll('.projectile')].map((projectile) => projectile.className),
      standbyLabel: document.querySelector('.combat-buff em')?.textContent
    };
  });
  if (queuedRelicBeforeVolley.combatBuff?.type !== 'frost'
    || queuedRelicBeforeVolley.combatBuffQueue.length !== 2
    || queuedRelicAtLaunch.volley.volleySize !== 3
    || queuedRelicAtLaunch.volley.combatBuffs?.map((buff) => buff?.type).join(',') !== 'frost,shatter,shatter'
    || queuedRelicAtLaunch.snapshot.combatBuff?.type !== 'shatter'
    || queuedRelicAtLaunch.snapshot.combatBuff?.shots !== 7
    || queuedRelicAtLaunch.snapshot.combatBuffQueue.length !== 1
    || queuedRelicAtLaunch.standbyLabel !== '候命 1'
    || !queuedRelicAtLaunch.projectileEffects[0]?.includes('is-frost')
    || queuedRelicAtLaunch.projectileEffects.slice(1).some((className) => !className.includes('is-shatter'))) {
    throw new Error(`Queued relic count or volley reservation is incorrect: ${JSON.stringify({ queuedRelicBeforeVolley, queuedRelicAtLaunch })}`);
  }
  await infinitePage.waitForTimeout(650);
  const queuedRelicAfterVolley = await infinitePage.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    frostApplied: document.querySelectorAll('.enemy.is-slowed').length,
    shatterApplied: document.querySelectorAll('.enemy.is-shattered').length,
    standbyLabel: document.querySelector('.combat-buff em')?.textContent
  }));
  if (queuedRelicAfterVolley.snapshot.combatBuff?.type !== 'shatter'
    || queuedRelicAfterVolley.snapshot.combatBuff?.shots !== 7
    || queuedRelicAfterVolley.snapshot.combatBuffQueue.length !== 1
    || queuedRelicAfterVolley.standbyLabel !== '候命 1'
    || queuedRelicAfterVolley.frostApplied !== 1
    || queuedRelicAfterVolley.shatterApplied !== 1) {
    throw new Error(`Projectile relic reservations changed before impact: ${JSON.stringify(queuedRelicAfterVolley)}`);
  }
  await infinitePage.close();

  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:4173/?testMode=1${expectedDriver === 'css' ? '&animationDriver=css' : ''}`, { waitUntil: 'networkidle' });
  await page.locator('#startButton').click();

  const pausedSwap = await page.evaluate((board) => {
    const test = window.__runeRampartTest;
    test.setBoard(board);
    const boardElement = document.querySelector('#matchBoard');
    const center = (index) => {
      const rect = boardElement.querySelector(`[data-index="${index}"]`).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const origin = 24;
    const target = 31;
    const start = center(origin);
    const destination = center(target);
    const release = {
      x: start.x + (destination.x - start.x) * .38,
      y: start.y + (destination.y - start.y) * .38
    };
    const pointer = { bubbles: true, pointerId: 501, pointerType: 'mouse', isPrimary: true, button: 0 };
    boardElement.querySelector(`[data-index="${origin}"]`).dispatchEvent(new PointerEvent('pointerdown', {
      ...pointer, clientX: start.x, clientY: start.y
    }));
    window.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: release.x, clientY: release.y }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: release.x, clientY: release.y }));
    document.querySelector('#pauseButton').click();
    return {
      snapshot: test.snapshot(),
      animation: test.animationState(),
      flow: test.boardFlowState(),
      board: test.snapshot().board.join(','),
      committing: document.querySelectorAll('.is-swap-committing').length
    };
  }, fixedBoard);

  if (pausedSwap.snapshot.resolution?.phase !== 'validate'
    || pausedSwap.flow.value !== 'swapValidate'
    || pausedSwap.animation.driver !== expectedDriver
    || (expectedDriver === 'motion' && pausedSwap.animation.active !== 2)
    || (expectedDriver === 'motion' && pausedSwap.animation.animations.some((animation) => !animation.paused))
    || (expectedDriver === 'css' && pausedSwap.animation.active !== 0)
    || pausedSwap.committing !== 2) {
    throw new Error(`Motion/XState swap did not enter a paused, observable lifecycle: ${JSON.stringify(pausedSwap)}`);
  }

  await page.waitForTimeout(250);
  const stillPaused = await page.evaluate(() => ({
    snapshot: window.__runeRampartTest.snapshot(),
    animation: window.__runeRampartTest.animationState()
  }));
  if (stillPaused.snapshot.resolution?.phase !== 'validate'
    || stillPaused.snapshot.board.join(',') !== pausedSwap.board
    || stillPaused.animation.active !== (expectedDriver === 'motion' ? 2 : 0)) {
    throw new Error(`Paused Motion swap advanced in the background: ${JSON.stringify(stillPaused)}`);
  }

  await page.locator('#pauseButton').click();
  await page.waitForFunction(() => !window.__runeRampartTest.snapshot().locked, null, { timeout: 5000 });
  const settled = await page.evaluate(() => ({
    animation: window.__runeRampartTest.animationState(),
    flow: window.__runeRampartTest.boardFlowState(),
    snapshot: window.__runeRampartTest.snapshot()
  }));
  if (settled.animation.active !== 0 || settled.flow.value !== 'idle' || settled.snapshot.resolution !== null) {
    throw new Error(`Migrated swap lifecycle did not settle cleanly: ${JSON.stringify(settled)}`);
  }

  const savedDuringSwap = await page.evaluate((board) => {
    const test = window.__runeRampartTest;
    test.setBoard(board);
    const boardElement = document.querySelector('#matchBoard');
    const center = (index) => {
      const rect = boardElement.querySelector(`[data-index="${index}"]`).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const start = center(24);
    const destination = center(31);
    const release = {
      x: start.x + (destination.x - start.x) * .38,
      y: start.y + (destination.y - start.y) * .38
    };
    const pointer = { bubbles: true, pointerId: 502, pointerType: 'mouse', isPrimary: true, button: 0 };
    boardElement.querySelector('[data-index="24"]').dispatchEvent(new PointerEvent('pointerdown', {
      ...pointer, clientX: start.x, clientY: start.y
    }));
    window.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: release.x, clientY: release.y }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: release.x, clientY: release.y }));
    document.querySelector('#pauseButton').click();
    return { save: test.savedProgress(), snapshot: test.snapshot() };
  }, fixedBoard);
  if (savedDuringSwap.save?.resolution?.phase !== 'validate' || !savedDuringSwap.snapshot.paused) {
    throw new Error(`Swap was not persisted in its validation phase: ${JSON.stringify(savedDuringSwap)}`);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#resumeButton').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#resumeButton').click();
  await page.waitForFunction(() => !window.__runeRampartTest.snapshot().locked, null, { timeout: 5000 });
  const restoredSwap = await page.evaluate(() => ({
    animation: window.__runeRampartTest.animationState(),
    flow: window.__runeRampartTest.boardFlowState(),
    snapshot: window.__runeRampartTest.snapshot()
  }));
  if (restoredSwap.snapshot.score <= savedDuringSwap.snapshot.score
    || findMatches(restoredSwap.snapshot.board).size
    || restoredSwap.snapshot.resolution !== null
    || restoredSwap.flow.value !== 'idle') {
    throw new Error(`Saved validation-phase swap did not resume and resolve cleanly: ${JSON.stringify(restoredSwap)}`);
  }

  await page.evaluate((board) => {
    window.__runeRampartTest.setBoard(board);
    document.querySelector('[data-index="0"]').click();
    document.querySelector('[data-index="1"]').click();
  }, fixedBoard);
  await page.waitForFunction(() => window.__runeRampartTest.snapshot().resolution?.phase === 'reverting', null, { timeout: 1500 });
  await page.locator('#pauseButton').click();
  const savedDuringRevert = await page.evaluate(() => ({
    save: window.__runeRampartTest.savedProgress(),
    snapshot: window.__runeRampartTest.snapshot()
  }));
  if (savedDuringRevert.save?.resolution?.phase !== 'reverting'
    || savedDuringRevert.save.board.join(',') !== fixedBoard.join(',')
    || savedDuringRevert.snapshot.board.join(',') !== fixedBoard.join(',')) {
    throw new Error(`Invalid click swap did not persist its original board during revert: ${JSON.stringify(savedDuringRevert)}`);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#resumeButton').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#resumeButton').click();
  await page.waitForFunction(() => !window.__runeRampartTest.snapshot().locked, null, { timeout: 3000 });
  const restoredRevert = await page.evaluate(() => window.__runeRampartTest.snapshot());
  if (restoredRevert.board.join(',') !== fixedBoard.join(',')
    || restoredRevert.score !== savedDuringRevert.snapshot.score
    || restoredRevert.resolution !== null) {
    throw new Error(`Saved reverting swap did not restore the original board: ${JSON.stringify(restoredRevert)}`);
  }

  const cancellationStart = await page.evaluate((board) => {
    const test = window.__runeRampartTest;
    test.setBoard(board);
    const boardElement = document.querySelector('#matchBoard');
    const center = (index) => {
      const rect = boardElement.querySelector(`[data-index="${index}"]`).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const start = center(24);
    const destination = center(31);
    const release = {
      x: start.x + (destination.x - start.x) * .38,
      y: start.y + (destination.y - start.y) * .38
    };
    const pointer = { bubbles: true, pointerId: 503, pointerType: 'mouse', isPrimary: true, button: 0 };
    boardElement.querySelector('[data-index="24"]').dispatchEvent(new PointerEvent('pointerdown', {
      ...pointer, clientX: start.x, clientY: start.y
    }));
    window.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: release.x, clientY: release.y }));
    window.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: release.x, clientY: release.y }));
    const before = {
      active: test.animationState().active,
      committing: document.querySelectorAll('.is-swap-committing').length
    };
    test.forceFailure();
    return before;
  }, fixedBoard);
  if (cancellationStart.committing !== 2
    || cancellationStart.active !== (expectedDriver === 'motion' ? 2 : 0)) {
    throw new Error(`Session cancellation did not begin during an active swap: ${JSON.stringify(cancellationStart)}`);
  }
  await page.waitForTimeout(50);
  const cancelledSession = await page.evaluate(() => ({
    animation: window.__runeRampartTest.animationState(),
    flow: window.__runeRampartTest.boardFlowState(),
    snapshot: window.__runeRampartTest.snapshot(),
    transientClasses: document.querySelectorAll('.is-drag-origin, .is-drag-returning, .is-swap-committing').length,
    transientStyles: [...document.querySelectorAll('.rune-tile')].filter((tile) => tile.style.transform
      || tile.style.getPropertyValue('--drag-x')
      || tile.style.getPropertyValue('--drag-y')
      || tile.style.getPropertyValue('--swap-duration')).length
  }));
  if (cancelledSession.animation.active !== 0
    || cancelledSession.flow.value !== 'idle'
    || cancelledSession.snapshot.resolution !== null
    || cancelledSession.transientClasses
    || cancelledSession.transientStyles) {
    throw new Error(`Old-session animation or actor leaked after session termination: ${JSON.stringify(cancelledSession)}`);
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  reducedPage.on('pageerror', (error) => errors.push(`reduced pageerror: ${error.message}`));
  reducedPage.on('console', (message) => { if (message.type() === 'error') errors.push(`reduced console: ${message.text()}`); });
  await reducedPage.goto(`http://127.0.0.1:4173/?testMode=1${expectedDriver === 'css' ? '&animationDriver=css' : ''}`, { waitUntil: 'networkidle' });
  await reducedPage.locator('#startButton').click();
  const reducedProjectileStart = await reducedPage.evaluate(() => {
    const test = window.__runeRampartTest;
    test.clearEnemies();
    test.spawnEnemy('boss');
    test.enterAllEnemies();
    test.setEquipment('charm', 1);
    test.fireBurst();
    return { animation: test.animationState(), projectiles: document.querySelectorAll('.projectile').length };
  });
  await reducedPage.waitForTimeout(100);
  const reducedProjectileMidway = await reducedPage.evaluate(() => ({
    animation: window.__runeRampartTest.animationState(),
    projectiles: document.querySelectorAll('.projectile').length
  }));
  if (reducedProjectileStart.projectiles !== 1
    || reducedProjectileMidway.projectiles !== 1
    || reducedProjectileMidway.animation.active !== (expectedDriver === 'motion' ? 1 : 0)) {
    throw new Error(`Reduced motion changed projectile business timing: ${JSON.stringify({ reducedProjectileStart, reducedProjectileMidway })}`);
  }
  await reducedPage.waitForTimeout(500);
  const reducedProjectileSettled = await reducedPage.evaluate(() => ({
    animation: window.__runeRampartTest.animationState(),
    projectiles: document.querySelectorAll('.projectile').length
  }));
  if (reducedProjectileSettled.projectiles || reducedProjectileSettled.animation.active) {
    throw new Error(`Reduced-motion projectile did not settle: ${JSON.stringify(reducedProjectileSettled)}`);
  }
  await reducedContext.close();
  if (errors.length) throw new Error(`Browser runtime errors: ${errors.join(' | ')}`);
  console.log(`Runtime migration smoke passed: infinite defense plus ${expectedDriver} pause/resume, reload, cancellation, reduced motion, and XState are synchronized.`);
} finally {
  await browser?.close();
}
