import { GAME_CONFIG } from '../config/game-config.js';
import { g } from './shared.js';
import { attachDom } from './dom.js';
import { attachLayout } from './layout.js';
import { attachAudio } from './audio.js';
import { attachState } from './state.js';
import { attachTooltip } from './tooltip.js';
import { attachTasks } from './tasks-attach.js';
import { attachAnimation } from './animation.js';
import { attachBoardFlow } from './board-flow.js';
import { attachHelpers } from './helpers.js';
import { attachHistory } from './history.js';
import { attachSave } from './save.js';
import { attachMathBridge } from './math-bridge.js';
import { attachBoard } from './board.js';
import { attachCombatStats } from './combat-stats.js';
import { attachHud } from './hud.js';
import { attachCombat } from './combat.js';
import { attachUi } from './ui.js';
import { attachEvents } from './events.js';
import { attachBoot } from './boot.js';

if (!GAME_CONFIG?.difficulties) throw new Error('Missing Rune Guard game configuration');

/** Compose domain modules and start the client runtime. */
export function startGame() {
  attachDom();
  attachLayout();
  attachAudio();
  attachState();
  attachTooltip();
  attachTasks();
  attachAnimation();
  attachBoardFlow();
  attachHelpers();
  attachHistory();
  attachSave();
  attachMathBridge();
  attachBoard();
  attachCombatStats();
  attachHud();
  attachCombat();
  attachUi();
  attachEvents();
  attachBoot();
  return g;
}

export { g };
