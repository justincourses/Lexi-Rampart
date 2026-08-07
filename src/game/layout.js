import { g } from './shared.js';
import { COMPACT_LANDSCAPE_CANVAS_WIDTH } from './constants.js';

export function attachLayout() {
  g.gameFitFrame = 0;

  function currentGameScale() {
    const scale = Number.parseFloat(getComputedStyle(g.els.gameShell).getPropertyValue('--game-scale'));
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  function fitGameToViewport() {
    g.gameFitFrame = 0;
    const viewportWidth = Math.max(1, document.documentElement.clientWidth || window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const portraitLocked = viewportWidth <= 820 && viewportHeight > viewportWidth;
    const compactLandscape = !portraitLocked && viewportWidth < COMPACT_LANDSCAPE_CANVAS_WIDTH && viewportWidth > viewportHeight;

    document.body.classList.toggle('portrait-game-locked', portraitLocked);
    g.els.gameViewport.classList.toggle('is-portrait-locked', portraitLocked);
    g.els.orientationGuard.classList.toggle('is-visible', portraitLocked);
    g.els.orientationGuard.setAttribute('aria-hidden', String(!portraitLocked));
    g.els.gameShell.inert = portraitLocked;

    g.els.gameViewport.classList.toggle('is-compact-landscape', compactLandscape);
    g.els.gameShell.style.setProperty('--game-canvas-width', compactLandscape ? `${COMPACT_LANDSCAPE_CANVAS_WIDTH}px` : '100%');
    g.els.gameShell.style.setProperty('--game-scale', '1');
    g.els.gameViewport.classList.remove('is-scaled');
    g.els.gameViewport.style.removeProperty('--game-scaled-height');

    if (portraitLocked) {
      g.els.gameViewport.dataset.scale = '1';
      return;
    }

    const naturalWidth = Math.max(1, g.els.gameShell.scrollWidth, g.els.gameShell.offsetWidth);
    const naturalHeight = Math.max(1, g.els.gameShell.scrollHeight, g.els.gameShell.offsetHeight);
    const scale = Math.min(1, viewportWidth / naturalWidth, viewportHeight / naturalHeight);
    const normalizedScale = scale > .998 ? 1 : scale;

    g.els.gameShell.style.setProperty('--game-scale', normalizedScale.toFixed(4));
    g.els.gameViewport.dataset.scale = normalizedScale.toFixed(4);
    g.els.gameViewport.style.setProperty('--game-scaled-height', `${Math.ceil(naturalHeight * normalizedScale)}px`);
    g.els.gameViewport.classList.toggle('is-scaled', normalizedScale < 1);
  }

  function scheduleGameFit() {
    cancelAnimationFrame(g.gameFitFrame);
    g.gameFitFrame = requestAnimationFrame(g.fitGameToViewport);
  }

  g.currentGameScale = currentGameScale;
  g.fitGameToViewport = fitGameToViewport;
  g.scheduleGameFit = scheduleGameFit;
}
