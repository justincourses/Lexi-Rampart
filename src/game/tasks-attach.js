import { g } from './shared.js';
import { createGameTaskScheduler } from './tasks.js';

export function attachTasks() {
  const scheduler = createGameTaskScheduler({
    shouldArm: () => g.state.started && !g.state.paused && !g.state.gameOver
  });
  Object.assign(g, scheduler, {
    pauseGameTasks(now) {
      scheduler.pauseGameTasks(now);
      g.pauseGameAnimations?.();
    },
    resumeGameTasks() {
      scheduler.resumeGameTasks();
      g.resumeGameAnimations?.();
    },
    clearGameTasks() {
      scheduler.clearGameTasks();
      g.cancelGameAnimations?.();
    }
  });

}
