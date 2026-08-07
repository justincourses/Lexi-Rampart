import { animate } from 'motion/mini';
import { g } from './shared.js';

export function attachAnimation() {
  const animations = new Set();
  let nextAnimationId = 1;
  const query = new URLSearchParams(window.location.search);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const driver = query.get('animationDriver') === 'css' || typeof Element.prototype.animate !== 'function'
    ? 'css'
    : 'motion';

  function usesMotionAnimations() {
    return driver === 'motion';
  }

  function playGameAnimation(
    element,
    keyframes,
    {
      durationMs = 0,
      delayMs = 0,
      ease = 'ease-out',
      sessionId = g.state.sessionId,
      cleanup,
      preserveDuration = false,
      reducedMotionKeyframes = keyframes
    } = {}
  ) {
    if (!element || !usesMotionAnimations()) {
      return { finished: Promise.resolve({ status: 'skipped' }), cancel() {} };
    }

    const effectiveDuration = reducedMotion && !preserveDuration ? Math.min(durationMs, 1) : durationMs;
    const effectiveDelay = reducedMotion ? 0 : delayMs;
    const controls = animate(element, reducedMotion ? reducedMotionKeyframes : keyframes, {
      duration: Math.max(.001, effectiveDuration / 1000),
      delay: Math.max(0, effectiveDelay / 1000),
      ease
    });
    let settled = false;
    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const record = {
      id: nextAnimationId,
      sessionId,
      controls,
      paused: false,
      cancel: () => {
        if (settled) return;
        try { controls.cancel(); } catch (error) { /* A completed WAAPI animation may already be detached. */ }
        settle('cancelled');
      }
    };
    nextAnimationId += 1;

    function settle(status) {
      if (settled) return;
      settled = true;
      animations.delete(record);
      try { cleanup?.(status); } finally { resolveFinished({ status }); }
    }

    animations.add(record);
    Promise.resolve(controls).then(() => settle('finished')).catch(() => settle('cancelled'));
    if (g.state.paused) {
      try { controls.pause(); record.paused = true; } catch (error) { /* Animation can settle synchronously. */ }
    }
    return { controls, finished, cancel: record.cancel };
  }

  function pauseGameAnimations() {
    animations.forEach((record) => {
      try {
        record.controls.pause();
        record.paused = true;
      } catch (error) { /* A just-finished animation will be removed by its promise. */ }
    });
  }

  function resumeGameAnimations() {
    animations.forEach((record) => {
      if (!record.paused) return;
      try {
        record.controls.play();
        record.paused = false;
      } catch (error) { /* A just-finished animation will be removed by its promise. */ }
    });
  }

  function cancelGameAnimations() {
    [...animations].forEach((record) => record.cancel());
  }

  function animationRegistrySnapshot() {
    return {
      driver,
      reducedMotion,
      active: animations.size,
      animations: [...animations].map(({ id, sessionId, paused }) => ({ id, sessionId, paused }))
    };
  }

  Object.assign(g, {
    usesMotionAnimations,
    playGameAnimation,
    pauseGameAnimations,
    resumeGameAnimations,
    cancelGameAnimations,
    animationRegistrySnapshot
  });
}
