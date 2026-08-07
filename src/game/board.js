import { g } from './shared.js';
import {
  ROWS, COLS, SYMBOLS, TYPE_NAMES, RELICS, SWAP_ANIMATION_MS, CASCADE_SETTLEMENT_COMPLETE_MS,
  ARMOR_WALL_BONUS, ARMOR_SHIELD_BONUS, EMBER_CAP_PER_WEAPON_LEVEL, MANA_CAP_PER_CHARM_LEVEL,
  MATCH_RESOLUTION_TIMING, RUNE_BURST_LIMITS, RUNE_DRAG_INTERACTION
} from './constants.js';
import { indexOf, clamp } from './utils.js';
import {
  findMatchesOnBoard, findMatchGroupsOnBoard, findMatchesAfterSwapOnBoard, hasPossibleMoveOnBoard,
  tilesAreAdjacent as tilesAreAdjacentPure,
  adjacentTileIndices as adjacentTileIndicesPure
} from './match-logic.js';
import * as combatMath from './combat-math.js';
import {
  advanceRuneGestureIntent, applyRuneGesturePreview, createRuneGestureState, runeDragTargetIndex
} from './gesture.js';

export function resolutionTimingFor(chain = 1, hasNextCombo = false) {
  return { ...(chain > 1 && hasNextCombo ? MATCH_RESOLUTION_TIMING.linked : MATCH_RESOLUTION_TIMING.normal) };
}

export function attachBoard() {
  let activeResolutionTiming = resolutionTimingFor(1);

  function buildBoard() {
    g.state.board = [];
    g.state.boardRelics = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        let type;
        do {
          type = g.randomType();
        } while (
          (col >= 2 && g.state.board[indexOf(row, col - 1)] === type && g.state.board[indexOf(row, col - 2)] === type) ||
          (row >= 2 && g.state.board[indexOf(row - 1, col)] === type && g.state.board[indexOf(row - 2, col)] === type)
        );
        g.state.board.push(type);
        g.state.boardRelics.push(g.randomRuneRelic());
      }
    }
    if (!g.hasPossibleMove()) g.buildBoard();
  }

  function renderBoard(matched = new Set(), invalidIndex = -1, phase = '', dropPlan = null) {
    const fragment = document.createDocumentFragment();
    g.els.board.classList.toggle('is-collapsing', phase === 'dropping');
    const boardGap = phase === 'dropping' ? Number.parseFloat(getComputedStyle(g.els.board).rowGap) || 4 : 0;
    g.state.board.forEach((type, index) => {
      const tile = document.createElement('button');
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      const dropRows = dropPlan?.get(index) || 0;
      const relicType = g.state.boardRelics[index];
      const relic = relicType ? RELICS[relicType] : null;
      tile.type = 'button';
      tile.className = `rune-tile ${type || ''}${relicType ? ` has-relic relic-${relicType}` : ''}`;
      if (g.state.selected === index) tile.classList.add('selected');
      if (matched.has(index)) tile.classList.add(phase === 'primed' ? 'match-primed' : 'matched');
      if (phase === 'initial') tile.classList.add('is-entering');
      if (phase === 'dropping' && dropRows > 0) {
        tile.classList.add('is-dropping');
        tile.dataset.dropRows = String(dropRows);
        tile.style.setProperty('--drop-offset', `calc(-${dropRows * 100}% - ${dropRows * boardGap}px)`);
      }
      if (index === invalidIndex) tile.classList.add('invalid');
      tile.dataset.index = String(index);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `${row + 1} 行 ${col + 1} 列，${TYPE_NAMES[type] || '空位'}${relic ? `，携带${relic.name}彩蛋` : ''}`);
      tile.style.animationDelay = phase === 'dropping' && dropRows > 0
        ? `${(ROWS - row) * activeResolutionTiming.dropRowStagger + col * activeResolutionTiming.dropColStagger}ms`
        : phase === 'initial' ? `${(row + col) * 7}ms` : '0ms';
      tile.innerHTML = `<span class="rune-symbol" aria-hidden="true">${SYMBOLS[type] || ''}</span>${relic ? `<span class="rune-relic-mark" title="消除后触发${relic.name}" aria-hidden="true">${relic.icon}</span>` : ''}`;
      fragment.appendChild(tile);
    });
    g.els.board.replaceChildren(fragment);
  }

  function findMatches() {
    return findMatchesOnBoard(g.state.board);
  }

  function findMatchGroups() {
    return findMatchGroupsOnBoard(g.state.board);
  }

  function countMatchGroups() {
    return g.findMatchGroups().length;
  }

  function hasPossibleMove() {
    return hasPossibleMoveOnBoard(g.state.board);
  }

  function findMatchesAfterSwap(first, second) {
    return findMatchesAfterSwapOnBoard(g.state.board, first, second);
  }

  function tilesAreAdjacent(first, second) {
    return tilesAreAdjacentPure(first, second);
  }

  function adjacentTileIndices(index) {
    return adjacentTileIndicesPure(index);
  }

  function setResolutionTiming(timing) {
    activeResolutionTiming = timing;
    const frame = g.$('.board-frame');
    frame.style.setProperty('--match-prime-duration', `${timing.prime}ms`);
    frame.style.setProperty('--match-burst-duration', `${timing.burst}ms`);
    frame.style.setProperty('--match-drop-duration', `${timing.drop}ms`);
  }

  function resolutionDropWait(timing, hasNextCombo = false) {
    const maximumStagger = ROWS * timing.dropRowStagger + (COLS - 1) * timing.dropColStagger;
    return timing.drop + maximumStagger + (hasNextCombo ? 0 : 15);
  }


  function tileExchangeOffset(firstTile, secondTile) {
    if (!firstTile || !secondTile) return { x: 0, y: 0, distance: 0 };
    const x = secondTile.offsetLeft - firstTile.offsetLeft;
    const y = secondTile.offsetTop - firstTile.offsetTop;
    return { x, y, distance: Math.max(Math.abs(x), Math.abs(y)) };
  }

  function setRuneDragOffset(tile, x, y) {
    if (!tile) return;
    tile.style.setProperty('--drag-x', `${x}px`);
    tile.style.setProperty('--drag-y', `${y}px`);
  }

  function clearTileExchangeVisual(...tiles) {
    tiles.forEach((tile) => {
      if (!tile) return;
      tile.classList.remove('is-drag-origin', 'is-drag-target', 'is-drag-armed', 'is-swap-committing');
      tile.style.removeProperty('--drag-x');
      tile.style.removeProperty('--drag-y');
      tile.style.removeProperty('--swap-duration');
      tile.style.removeProperty('transform');
    });
  }

  async function animateTileExchange(first, second, dragVisual = null) {
    const firstTile = Number(dragVisual?.originTile?.dataset.index) === first
      ? dragVisual.originTile
      : g.els.board.querySelector(`[data-index="${first}"]`);
    const secondTile = Number(dragVisual?.targetTile?.dataset.index) === second
      ? dragVisual.targetTile
      : g.els.board.querySelector(`[data-index="${second}"]`);
    if (!firstTile || !secondTile) return;
    const offset = g.tileExchangeOffset(firstTile, secondTile);
    const previewProgress = clamp(dragVisual?.previewProgress || 0, 0, 1);
    const duration = dragVisual
      ? Math.round(RUNE_DRAG_INTERACTION.settleMinimumMs
        + (RUNE_DRAG_INTERACTION.settleMaximumMs - RUNE_DRAG_INTERACTION.settleMinimumMs) * (1 - previewProgress))
      : SWAP_ANIMATION_MS;
    firstTile.classList.remove('is-drag-origin');
    secondTile.classList.remove('is-drag-target', 'is-drag-armed');
    firstTile.style.setProperty('--swap-duration', `${duration}ms`);
    secondTile.style.setProperty('--swap-duration', `${duration}ms`);
    firstTile.classList.add('is-swap-committing');
    secondTile.classList.add('is-swap-committing');
    void firstTile.offsetWidth;
    try {
      if (g.usesMotionAnimations()) {
        const firstTransform = getComputedStyle(firstTile).transform;
        const secondTransform = getComputedStyle(secondTile).transform;
        const sessionId = g.state.sessionId;
        const firstAnimation = g.playGameAnimation(firstTile, {
          transform: [firstTransform === 'none' ? 'translate(0px, 0px) scale(1)' : firstTransform, `translate(${offset.x}px, ${offset.y}px) scale(1.025)`]
        }, { durationMs: duration, ease: [.2, .88, .24, 1], sessionId });
        const secondAnimation = g.playGameAnimation(secondTile, {
          transform: [secondTransform === 'none' ? 'translate(0px, 0px) scale(1)' : secondTransform, `translate(${-offset.x}px, ${-offset.y}px) scale(1.025)`]
        }, { durationMs: duration, ease: [.2, .88, .24, 1], sessionId });
        await Promise.all([firstAnimation.finished, secondAnimation.finished]);
        return;
      }
      g.setRuneDragOffset(firstTile, offset.x, offset.y);
      g.setRuneDragOffset(secondTile, -offset.x, -offset.y);
      await g.wait(duration);
    } finally {
      clearTileExchangeVisual(firstTile, secondTile);
    }
  }

  async function animateRejectedRuneDrag(dragVisual) {
    const originTile = dragVisual?.originTile;
    if (!originTile) return;
    const initialTransform = getComputedStyle(originTile).transform;
    originTile.classList.add('is-drag-returning');
    originTile.classList.remove('is-drag-origin');
    if (g.usesMotionAnimations()) {
      const animation = g.playGameAnimation(originTile, {
        transform: [initialTransform === 'none' ? 'translate(0px, 0px) scale(1.07)' : initialTransform, 'translate(0px, 0px) scale(1)']
      }, {
        durationMs: RUNE_DRAG_INTERACTION.rejectedReturnMs,
        ease: [.22, .78, .28, 1],
        cleanup: () => {
          originTile.classList.remove('is-drag-returning');
          originTile.style.removeProperty('transform');
          originTile.style.removeProperty('--drag-x');
          originTile.style.removeProperty('--drag-y');
        }
      });
      await animation.finished;
      return;
    }
    await g.wait(RUNE_DRAG_INTERACTION.rejectedReturnMs);
    originTile.classList.remove('is-drag-returning');
    originTile.style.removeProperty('--drag-x');
    originTile.style.removeProperty('--drag-y');
  }

  async function swapTiles(first, second, dragVisual = null) {
    if (!g.state.started || g.state.paused || g.state.locked || g.state.gameOver || !g.tilesAreAdjacent(first, second)) return false;
    const sessionId = g.state.sessionId;
    const anticipatedMatches = g.findMatchesAfterSwap(first, second);
    g.state.locked = true;
    g.resetCascadeSettlement();
    g.startSwapFlow(first, second);
    g.state.selected = null;
    g.sound.play('click', .15, 1.16);
    if (anticipatedMatches.size === 0 && dragVisual) {
      g.sound.play('denied', .2, .82);
      g.revertSwapFlow();
      await g.animateRejectedRuneDrag(dragVisual);
      if (sessionId !== g.state.sessionId) return false;
      g.state.locked = false;
      g.completeBoardFlow();
      g.flushPendingSave();
      return false;
    }
    await g.animateTileExchange(first, second, dragVisual);
    if (sessionId !== g.state.sessionId) return false;
    [g.state.board[first], g.state.board[second]] = [g.state.board[second], g.state.board[first]];
    [g.state.boardRelics[first], g.state.boardRelics[second]] = [g.state.boardRelics[second], g.state.boardRelics[first]];
    g.renderBoard();
    if (anticipatedMatches.size === 0) {
      g.sound.play('denied', .2, .82);
      g.revertSwapFlow();
      [g.state.board[first], g.state.board[second]] = [g.state.board[second], g.state.board[first]];
      [g.state.boardRelics[first], g.state.boardRelics[second]] = [g.state.boardRelics[second], g.state.boardRelics[first]];
      await g.animateTileExchange(first, second);
      if (sessionId !== g.state.sessionId) return false;
      g.renderBoard(new Set(), second);
      await g.wait(280);
      if (sessionId !== g.state.sessionId) return false;
      g.renderBoard();
      g.state.locked = false;
      g.completeBoardFlow();
      g.flushPendingSave();
      return false;
    }
    g.startResolveFlow();
    await g.resolveBoard(sessionId);
    if (sessionId !== g.state.sessionId) return false;
    g.state.locked = false;
    g.completeBoardFlow();
    g.flushPendingSave();
    return true;
  }

  async function handleTile(index) {
    if (!g.state.started || g.state.paused || g.state.locked || g.state.gameOver) return;
    if (g.state.selected === null) {
      g.sound.play('click', .13, 1.05);
      g.state.selected = index;
      g.renderBoard();
      return;
    }
    if (g.state.selected === index) {
      g.sound.play('click', .1, .88);
      g.state.selected = null;
      g.renderBoard();
      return;
    }

    const first = g.state.selected;
    if (!g.tilesAreAdjacent(first, index)) {
      g.sound.play('click', .12, 1.08);
      g.state.selected = index;
      g.renderBoard();
      return;
    }
    await g.swapTiles(first, index);
  }

  function dragTargetIndex(startIndex, deltaX, deltaY) {
    const axis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y';
    const direction = Math.sign(axis === 'x' ? deltaX : deltaY);
    return runeDragTargetIndex(startIndex, axis, direction);
  }

  function clearRuneDrag(suppressClick = false) {
    const gesture = g.runeDragGesture;
    if (!gesture) return;
    g.runeDragGesture = null;
    if (suppressClick) g.suppressBoardClickUntil = performance.now() + 500;
    [...new Set([gesture.originTile, gesture.targetTile, ...gesture.optionTiles])].forEach((tile) => {
      tile?.classList.remove('is-drag-origin', 'is-drag-option', 'is-drag-target', 'is-drag-armed', 'is-swap-committing');
      tile?.style.removeProperty('--drag-x');
      tile?.style.removeProperty('--drag-y');
    });
    g.els.board.classList.remove('is-rune-dragging', 'is-drag-armed');
    if (g.els.board.hasPointerCapture?.(gesture.pointerId)) {
      try { g.els.board.releasePointerCapture(gesture.pointerId); } catch (error) { /* Capture can already be released by the browser. */ }
    }
  }

  function releaseRuneDragForSwap(gesture) {
    g.runeDragGesture = null;
    g.suppressBoardClickUntil = performance.now() + 500;
    g.els.board.classList.remove('is-rune-dragging', 'is-drag-armed');
    if (g.els.board.hasPointerCapture?.(gesture.pointerId)) {
      try { g.els.board.releasePointerCapture(gesture.pointerId); } catch (error) { /* Capture can already be released by the browser. */ }
    }
    return {
      originTile: gesture.originTile,
      targetTile: gesture.targetTile,
      previewProgress: gesture.previewProgress
    };
  }

  function beginRuneDrag(event) {
    const tile = event.target.closest('.rune-tile');
    if (!tile || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (!g.state.started || g.state.paused || g.state.locked || g.state.gameOver) return;
    g.clearRuneDrag();
    const startIndex = Number(tile.dataset.index);
    const tileRect = tile.getBoundingClientRect();
    const optionTiles = g.adjacentTileIndices(startIndex)
      .map((index) => g.els.board.querySelector(`[data-index="${index}"]`))
      .filter(Boolean);
    g.runeDragGesture = {
      ...createRuneGestureState({
        startIndex,
        startX: event.clientX,
        startY: event.clientY,
        pointerScale: tile.offsetWidth ? tileRect.width / tile.offsetWidth : 1
      }),
      pointerId: event.pointerId,
      originTile: tile,
      targetTile: null,
      optionTiles
    };
    tile.classList.add('is-drag-origin');
    g.els.board.classList.add('is-rune-dragging');
    try { g.els.board.setPointerCapture(event.pointerId); } catch (error) { /* Pointer capture is optional on older browsers. */ }
  }

  function updateRuneDragGesture(gesture, clientX, clientY) {
    const intent = advanceRuneGestureIntent(gesture, clientX, clientY);
    const targetIndex = intent.targetIndex;
    const targetTile = targetIndex === null ? null : g.els.board.querySelector(`[data-index="${targetIndex}"]`);

    if (!targetTile) {
      const next = applyRuneGesturePreview(intent, 0);
      Object.assign(gesture, next, { targetTile: null });
      g.setRuneDragOffset(
        gesture.originTile,
        gesture.axis === 'x' ? gesture.blockedDistance * gesture.direction : 0,
        gesture.axis === 'y' ? gesture.blockedDistance * gesture.direction : 0
      );
      g.els.board.classList.remove('is-drag-armed');
      return gesture;
    }

    const offset = g.tileExchangeOffset(gesture.originTile, targetTile);
    const next = applyRuneGesturePreview(intent, offset.distance);
    Object.assign(gesture, next, { targetTile });
    g.setRuneDragOffset(gesture.originTile, offset.x * gesture.previewProgress, offset.y * gesture.previewProgress);
    g.els.board.classList.toggle('is-drag-armed', gesture.armed);
    return gesture;
  }

  function moveRuneDrag(event) {
    const gesture = g.runeDragGesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!g.state.started || g.state.paused || g.state.locked || g.state.gameOver) {
      g.clearRuneDrag(gesture.moved);
      return;
    }
    g.updateRuneDragGesture(gesture, event.clientX, event.clientY);
    if (gesture.moved) event.preventDefault();
  }

  function endRuneDrag(event) {
    const gesture = g.runeDragGesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    g.updateRuneDragGesture(gesture, event.clientX, event.clientY);
    const { moved, startIndex } = gesture;
    if (!moved) {
      g.clearRuneDrag(true);
      void g.handleTile(startIndex);
      return;
    }
    const targetIndex = gesture.lockedTargetIndex;
    const targetTile = targetIndex === null
      ? null
      : g.els.board.querySelector(`[data-index="${targetIndex}"]`);
    if (targetIndex === null || !targetTile) {
      g.clearRuneDrag(true);
      return;
    }
    gesture.targetIndex = targetIndex;
    gesture.targetTile = targetTile;
    gesture.armed = true;
    const dragVisual = g.releaseRuneDragForSwap(gesture);
    void g.swapTiles(startIndex, targetIndex, dragVisual);
  }

  function cancelRuneDrag(event) {
    const gesture = g.runeDragGesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    g.clearRuneDrag(gesture.moved);
  }

  async function resolveBoard(sessionId) {
    let chain = 1;
    const initialMatches = g.findMatches();
    const cascadeQueue = initialMatches.size ? [g.planCascadeStep(initialMatches)] : [];
    const cascadeRewards = { score: 0, forge: 0, ember: 0, mana: 0, energy: 0 };
    while (cascadeQueue.length > 0) {
      const step = cascadeQueue.shift();
      const hasNextCombo = step.nextMatches.size > 0;
      g.state.combo = chain;
      g.updateCombo();
      const timing = resolutionTimingFor(chain, hasNextCombo);
      g.setResolutionTiming(timing);

      if (chain > 1) g.announceCascade(chain, cascadeRewards);
      g.primeBoardFlow();
      g.renderBoard(step.matches, -1, 'primed');
      g.$('.board-frame').classList.add('is-charging');
      g.sound.tone(142 + chain * 24, .32, 'sine', .025);
      await g.wait(timing.prime);
      if (sessionId !== g.state.sessionId) return;

      g.createRuneBurst(step.matches, chain);
      g.burstBoardFlow();
      g.$('.board-frame').classList.remove('is-charging');
      g.$('.board-frame').classList.remove('is-bursting');
      void g.$('.board-frame').offsetWidth;
      g.$('.board-frame').classList.add('is-bursting');
      g.renderBoard(step.matches, -1, 'burst');
      g.sound.match(chain, step.counts);
      await g.wait(timing.burst);
      if (sessionId !== g.state.sessionId) return;

      const reward = g.applyRewards(step.counts, chain, step.matchGroups);
      Object.keys(cascadeRewards).forEach((key) => { cascadeRewards[key] += reward[key] || 0; });
      step.matchedRelics.forEach((type) => g.activateRelic(type, 'board'));
      g.state.board = step.board;
      g.state.boardRelics = step.boardRelics;
      const queuedNext = hasNextCombo ? g.planCascadeStep(step.nextMatches) : null;
      if (chain > 1) g.updateCascadeSettlement(chain, cascadeRewards);
      g.dropBoardFlow();
      g.renderBoard(new Set(), -1, 'dropping', step.dropPlan);
      g.sound.tone(105, .09, 'triangle', .025, .19);
      await g.wait(g.resolutionDropWait(timing, hasNextCombo));
      if (sessionId !== g.state.sessionId) return;
      g.els.board.classList.remove('is-collapsing');
      if (queuedNext) {
        g.nextBoardFlow();
        cascadeQueue.push(queuedNext);
      } else if (chain > 1) g.completeCascadeSettlement(chain, cascadeRewards);
      chain += 1;
    }
    g.state.combo = 1;
    g.scheduleGameTask(g.updateCombo, 450);
    if (!g.hasPossibleMove()) {
      g.addLog('符文矩阵重组，新的路径已显现');
      g.buildBoard();
      g.renderBoard(new Set(), -1, 'initial');
    }
  }

  function updateCascadeSettlement(chain, rewards, { complete = false } = {}) {
    const callout = g.els.cascadeCallout;
    const multiplier = 1 + (chain - 1) * .6;
    g.$('#cascadeTitle').textContent = complete ? '连锁结算完成' : chain >= 4 ? '符文暴走' : '自动连锁';
    g.$('#cascadeValue').textContent = `×${chain}`;
    g.$('#cascadeMultiplier').textContent = `当前收益倍率 ×${multiplier.toFixed(1)}`;
    g.$('#cascadeScore').textContent = `+${Math.round(rewards.score)}`;
    g.$('#cascadeForge').textContent = `+${Math.round(rewards.forge)}`;
    g.$('#cascadeMana').textContent = `+${Math.round(rewards.mana)}`;
    g.$('#cascadeEnergy').textContent = `+${Math.round(rewards.energy)}`;
    callout.classList.add('is-visible');
    callout.classList.toggle('is-complete', complete);
    callout.classList.remove('is-updating');
    void callout.offsetWidth;
    callout.classList.add('is-updating');
    g.cascadeSettlementToken = (g.cascadeSettlementToken || 0) + 1;
    return g.cascadeSettlementToken;
  }

  function announceCascade(chain, rewards) {
    g.sound.cascade(chain);
    g.updateCascadeSettlement(chain, rewards);
  }

  function completeCascadeSettlement(chain, rewards) {
    const token = g.updateCascadeSettlement(chain, rewards, { complete: true });
    g.scheduleGameTask(() => {
      if (token !== g.cascadeSettlementToken) return;
      g.els.cascadeCallout.classList.remove('is-visible', 'is-updating', 'is-complete');
    }, CASCADE_SETTLEMENT_COMPLETE_MS);
  }

  function resetCascadeSettlement() {
    g.cascadeSettlementToken = (g.cascadeSettlementToken || 0) + 1;
    g.els.cascadeCallout?.classList.remove('is-visible', 'is-updating', 'is-complete');
  }

  function constrainedEffectsDevice() {
    const cores = Number(navigator.hardwareConcurrency) || 8;
    const memory = Number(navigator.deviceMemory) || 8;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || cores <= 4 || memory <= 4;
  }

  function createRuneBurst(matches, chain = 1) {
    const effectsRect = g.els.boardEffects.getBoundingClientRect();
    const scale = g.currentGameScale();
    const positions = [...matches].map((index) => {
      const tile = g.els.board.querySelector(`[data-index="${index}"]`);
      if (!tile) return null;
      const rect = tile.getBoundingClientRect();
      return {
        type: g.state.board[index],
        x: (rect.left - effectsRect.left + rect.width / 2) / scale,
        y: (rect.top - effectsRect.top + rect.height / 2) / scale
      };
    }).filter(Boolean);
    if (!positions.length) return;

    const limits = constrainedEffectsDevice() ? RUNE_BURST_LIMITS.constrained : RUNE_BURST_LIMITS.standard;
    const perTile = chain > 1 ? limits.comboParticles : limits.firstParticles;
    const maximum = chain > 1 ? limits.comboMaximum : limits.firstMaximum;
    const particleCount = Math.min(maximum, positions.length * perTile);
    const activeLayers = [...g.els.boardEffects.querySelectorAll('.rune-burst-layer')];
    activeLayers.slice(0, Math.max(0, activeLayers.length - limits.activeLayers + 1)).forEach((layer) => layer.remove());

    const layer = document.createElement('div');
    const fragment = document.createDocumentFragment();
    layer.className = 'rune-burst-layer';
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
      const position = positions[particleIndex % positions.length];
      const particle = document.createElement('i');
      const angle = (Math.PI * 2 * particleIndex / particleCount) + Math.random() * .65;
      const distance = 25 + Math.random() * 45;
      particle.className = `rune-spark ${position.type}`;
      particle.style.left = `${position.x}px`;
      particle.style.top = `${position.y}px`;
      particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      particle.style.animationDelay = `${(particleIndex % perTile) * 18}ms`;
      fragment.appendChild(particle);
    }
    layer.appendChild(fragment);
    g.els.boardEffects.appendChild(layer);
    g.scheduleGameTask(() => layer.remove(), 850);
  }

  function planBoardCollapse(matches = new Set()) {
    const board = Array(ROWS * COLS).fill(null);
    const boardRelics = Array(ROWS * COLS).fill(null);
    const dropPlan = new Map();
    for (let col = 0; col < COLS; col += 1) {
      const remaining = [];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const index = indexOf(row, col);
        const value = g.state.board[index];
        if (value && !matches.has(index)) remaining.push({ type: value, relic: g.state.boardRelics[index], sourceRow: row });
      }
      const spawnedRows = ROWS - remaining.length;
      for (let row = ROWS - 1, cursor = 0; row >= 0; row -= 1, cursor += 1) {
        const index = indexOf(row, col);
        const tile = remaining[cursor];
        board[index] = tile?.type || g.randomType();
        boardRelics[index] = tile ? tile.relic : g.randomRuneRelic();
        const dropRows = tile ? row - tile.sourceRow : spawnedRows;
        if (dropRows > 0) dropPlan.set(index, dropRows);
      }
    }
    return { board, boardRelics, dropPlan };
  }

  function planCascadeStep(matches) {
    const stableMatches = new Set(matches);
    const counts = { ember: 0, mana: 0, moss: 0, coin: 0 };
    stableMatches.forEach((index) => { counts[g.state.board[index]] += 1; });
    const collapse = g.planBoardCollapse(stableMatches);
    return {
      matches: stableMatches,
      counts,
      matchGroups: findMatchGroupsOnBoard(g.state.board),
      matchedRelics: [...stableMatches].map((index) => g.state.boardRelics[index]).filter(Boolean),
      board: collapse.board,
      boardRelics: collapse.boardRelics,
      dropPlan: collapse.dropPlan,
      nextMatches: findMatchesOnBoard(collapse.board)
    };
  }

  function collapseBoard(matches = new Set()) {
    const collapse = g.planBoardCollapse(matches);
    g.state.board = collapse.board;
    g.state.boardRelics = collapse.boardRelics;
    return collapse.dropPlan;
  }

  function pulseResource(type, text, mode = 'gain') {
    const legend = g.$(`.legend-item.${type}`);
    if (!legend) return;
    legend.classList.remove('is-gaining', 'is-spending');
    void legend.offsetWidth;
    legend.classList.add(mode === 'spend' ? 'is-spending' : 'is-gaining');
    const delta = document.createElement('em');
    delta.className = `resource-delta ${mode}`;
    delta.textContent = text;
    legend.appendChild(delta);
    g.scheduleGameTask(() => {
      delta.remove();
      legend.classList.remove('is-gaining', 'is-spending');
    }, 850);
  }

  function pulseForgeMeter() {
    const meter = g.$('.forge-meter-wrap');
    meter.classList.remove('is-gaining');
    void meter.offsetWidth;
    meter.classList.add('is-gaining');
    g.scheduleGameTask(() => meter.classList.remove('is-gaining'), 700);
  }

  function reinforcementReward(groups) {
    return combatMath.reinforcementReward(groups);
  }

  function applyRewards(counts, chain, matchGroups = []) {
    const multiplier = 1 + (chain - 1) * 0.6;
    const groupCount = matchGroups.length;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const reward = { score: Math.round(total * 12 * multiplier), forge: 0, ember: 0, mana: 0, energy: 0 };
    g.state.waveMatches += groupCount;
    g.state.totalMatches += groupCount;
    g.state.score += reward.score;
    if (counts.ember) {
      const previous = g.state.emberCharges;
      g.state.emberCharges = Math.min(g.emberCapacity(), g.state.emberCharges + counts.ember);
      const gain = g.state.emberCharges - previous;
      reward.ember = gain;
      g.pulseResource('ember', gain ? `+${gain}` : '已满');
      g.showCombatToast(gain ? `余烬 +${gain}` : '余烬已满', 'damage', 26, 32);
    }
    if (counts.mana) {
      const gain = Math.round(counts.mana * 2 * multiplier);
      const previous = g.state.mana;
      g.state.mana = Math.min(g.manaCapacity(), g.state.mana + gain);
      const accepted = g.state.mana - previous;
      reward.mana = accepted;
      g.pulseResource('mana', accepted ? `+${accepted}` : '已满');
      g.showCombatToast(accepted ? `奥能 +${accepted}` : '奥能已满', 'mana', 39, 24);
    }
    if (counts.moss) {
      reward.energy = g.applyMossSupport(counts.moss * 14 * multiplier).accepted;
    }
    const reinforcement = g.reinforcementReward(matchGroups);
    reward.forge = reinforcement.total;
    g.state.forge += reinforcement.total;
    g.pulseResource('coin', `+${reinforcement.total}`);
    g.pulseForgeMeter();
    g.showCombatToast(`补强 +${reinforcement.total}`, 'forge', 73, 32);
    if (reinforcement.longBonus || reinforcement.coinBonus) {
      const bonuses = [reinforcement.longBonus ? `长连 +${reinforcement.longBonus}` : '', reinforcement.coinBonus ? `铸币 +${reinforcement.coinBonus}` : ''].filter(Boolean).join('、');
      g.addLog(`补强 +${reinforcement.total}（基础 ${reinforcement.base}，${bonuses}）`);
    }
    g.checkForge();
    if (chain > 1) g.addLog(`${chain} 连锁！奥能、防御能量与军功收益提升 ${Math.round((multiplier - 1) * 100)}%`);
    g.updateUI();
    return reward;
  }

  function checkForge() {
    while (true) {
      const slot = g.syncForgeTarget();
      const cost = g.forgeCostFor(slot);
      if (g.state.forge < cost) break;
      g.state.forge -= cost;
      const previousEmberCapacity = g.emberCapacity();
      const previousManaCapacity = g.manaCapacity();
      g.state.equipment[slot] += 1;
      if (g.state.upgradeMode === 'auto') g.state.autoUpgradeIndex += 1;
      let upgradeDetail = '';
      if (slot === 'weapon') {
        const capacityGain = g.emberCapacity() - previousEmberCapacity;
        upgradeDetail = `；余烬上限 +${capacityGain}`;
        g.pulseResource('ember', `上限 +${capacityGain}`);
        g.showCombatToast(`余烬上限 +${capacityGain}`, 'damage', 26, 32);
      } else if (slot === 'charm') {
        const capacityGain = g.manaCapacity() - previousManaCapacity;
        upgradeDetail = `；奥能上限 +${capacityGain}`;
        g.pulseResource('mana', `上限 +${capacityGain}`);
        g.showCombatToast(`奥能上限 +${capacityGain}`, 'mana', 39, 24);
      } else if (slot === 'armor') {
        const wallBefore = g.state.wall;
        g.state.wallMax += ARMOR_WALL_BONUS;
        g.state.wall = Math.min(g.state.wallMax, g.state.wall + ARMOR_WALL_BONUS);
        const restored = Math.max(0, Math.round(g.state.wall - wallBefore));
        upgradeDetail = `；耐久上限 +${ARMOR_WALL_BONUS}，护盾上限 +${ARMOR_SHIELD_BONUS}${restored ? `，同步修复 ${restored}` : ''}`;
        const wallStatus = g.$('.wall-status');
        wallStatus.classList.remove('is-upgraded');
        void wallStatus.offsetWidth;
        wallStatus.classList.add('is-upgraded');
        g.scheduleGameTask(() => wallStatus.classList.remove('is-upgraded'), 950);
        g.showCombatToast(`耐久上限 +${ARMOR_WALL_BONUS} · 护盾上限 +${ARMOR_SHIELD_BONUS}${restored ? ` · 修复 +${restored}` : ''}`, 'repair', 20, 48);
      }
      g.addLog(`消耗 ${cost} 点补强，${g.upgradeSlotLabel(slot)}从 LV.${g.state.equipment[slot] - 1} 升至 LV.${g.state.equipment[slot]}${upgradeDetail}${g.state.upgradeMode === 'auto' ? '；自动策略将重新选择目标' : ''}`);
      g.scheduleGameTask(() => g.pulseResource('coin', `-${cost}`, 'spend'), 180);
      g.celebrateEquipmentUpgrade(slot, cost);
    }
    g.syncForgeTarget();
  }

  function celebrateEquipmentUpgrade(slot, cost) {
    const level = g.state.equipment[slot];
    const card = g.$(`#${slot}Card`);
    const banner = g.els.upgradeBanner;

    g.$(`#${slot}Level`).textContent = level;
    g.$(`#${slot}Name`).textContent = g.equipmentName(slot);
    if (slot === 'weapon') g.$('#weaponStat').textContent = `攻击 ${g.totalPower()}`;
    if (slot === 'armor') g.$('#armorStat').textContent = `减伤 ${g.wallDefense()}%`;
    if (slot === 'charm') g.$('#charmStat').textContent = g.charmStatLabel();
    g.updateFieldHud();

    g.$('#upgradeEquipmentName').textContent = g.equipmentName(slot);
    const capacityDetail = slot === 'armor'
      ? `耐久上限 +${ARMOR_WALL_BONUS} · 护盾上限 +${ARMOR_SHIELD_BONUS}`
      : slot === 'weapon' ? `余烬上限 +${EMBER_CAP_PER_WEAPON_LEVEL}` : `奥能上限 +${MANA_CAP_PER_CHARM_LEVEL}`;
    g.$('#upgradeEquipmentLevel').textContent = `消耗 ${cost} 补强 · LV.${level} · ${g.state.upgradeMode === 'auto' ? '自动补强' : '优先升级'} · ${capacityDetail}`;
    banner.classList.remove('is-visible');
    card.classList.remove('is-upgraded');
    void banner.offsetWidth;
    void card.offsetWidth;
    banner.classList.add('is-visible');
    card.classList.add('is-upgraded');

    for (let index = 0; index < 14; index += 1) {
      const spark = document.createElement('i');
      const angle = Math.PI * 2 * index / 14 + Math.random() * .25;
      const distance = 34 + Math.random() * 48;
      spark.className = 'equipment-spark';
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.animationDelay = `${index * 18}ms`;
      card.appendChild(spark);
      g.scheduleGameTask(() => spark.remove(), 1050);
    }

    g.sound.play('forge', .48, .96);
    g.sound.tone(294, .22, 'triangle', .045, .02);
    g.sound.tone(392, .26, 'triangle', .045, .13);
    g.sound.tone(587, .34, 'sine', .04, .26);
    g.sound.tone(784, .42, 'sine', .03, .41);
    g.scheduleGameTask(() => {
      banner.classList.remove('is-visible');
      card.classList.remove('is-upgraded');
    }, 1950);
  }

  g.buildBoard = buildBoard;
  g.renderBoard = renderBoard;
  g.findMatches = findMatches;
  g.findMatchGroups = findMatchGroups;
  g.countMatchGroups = countMatchGroups;
  g.hasPossibleMove = hasPossibleMove;
  g.findMatchesAfterSwap = findMatchesAfterSwap;
  g.tilesAreAdjacent = tilesAreAdjacent;
  g.adjacentTileIndices = adjacentTileIndices;
  g.setResolutionTiming = setResolutionTiming;
  g.resolutionDropWait = resolutionDropWait;
  g.tileExchangeOffset = tileExchangeOffset;
  g.setRuneDragOffset = setRuneDragOffset;
  g.animateTileExchange = animateTileExchange;
  g.animateRejectedRuneDrag = animateRejectedRuneDrag;
  g.swapTiles = swapTiles;
  g.handleTile = handleTile;
  g.dragTargetIndex = dragTargetIndex;
  g.clearRuneDrag = clearRuneDrag;
  g.releaseRuneDragForSwap = releaseRuneDragForSwap;
  g.updateRuneDragGesture = updateRuneDragGesture;
  g.beginRuneDrag = beginRuneDrag;
  g.moveRuneDrag = moveRuneDrag;
  g.endRuneDrag = endRuneDrag;
  g.cancelRuneDrag = cancelRuneDrag;
  g.resolveBoard = resolveBoard;
  g.updateCascadeSettlement = updateCascadeSettlement;
  g.announceCascade = announceCascade;
  g.completeCascadeSettlement = completeCascadeSettlement;
  g.resetCascadeSettlement = resetCascadeSettlement;
  g.createRuneBurst = createRuneBurst;
  g.planBoardCollapse = planBoardCollapse;
  g.planCascadeStep = planCascadeStep;
  g.collapseBoard = collapseBoard;
  g.pulseResource = pulseResource;
  g.pulseForgeMeter = pulseForgeMeter;
  g.reinforcementReward = reinforcementReward;
  g.applyRewards = applyRewards;
  g.checkForge = checkForge;
  g.celebrateEquipmentUpgrade = celebrateEquipmentUpgrade;
}
