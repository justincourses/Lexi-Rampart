import './config/game-config.js';
import { startGame } from './game/runtime.js';

try {
  startGame();
  window.__runeRampartAssetRecovery?.markReady(__RUNE_RAMPART_BUILD_ID__);
} catch (error) {
  window.__runeRampartAssetRecovery?.showFatal(error);
  throw error;
}
