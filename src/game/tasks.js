/**
 * Pausable timeout scheduler used by animations, combat FX, and board resolution.
 * @param {{ shouldArm?: () => boolean }} options
 */
export function createGameTaskScheduler({ shouldArm = () => true } = {}) {
  const gameTasks = new Set();

  function armGameTask(task) {
    task.startedAt = performance.now();
    task.nativeId = window.setTimeout(() => {
      task.nativeId = 0;
      gameTasks.delete(task);
      task.callback();
    }, Math.max(0, task.remaining));
  }

  function scheduleGameTask(callback, delay = 0, onCancel = null) {
    const task = {
      callback,
      onCancel,
      remaining: Math.max(0, Number(delay) || 0),
      startedAt: 0,
      nativeId: 0
    };
    gameTasks.add(task);
    if (shouldArm()) armGameTask(task);
    return task;
  }

  function pauseGameTasks(now = performance.now()) {
    gameTasks.forEach((task) => {
      if (!task.nativeId) return;
      window.clearTimeout(task.nativeId);
      task.nativeId = 0;
      task.remaining = Math.max(0, task.remaining - (now - task.startedAt));
    });
  }

  function resumeGameTasks() {
    gameTasks.forEach((task) => {
      if (!task.nativeId) armGameTask(task);
    });
  }

  function clearGameTasks() {
    gameTasks.forEach((task) => {
      if (task.nativeId) window.clearTimeout(task.nativeId);
      task.onCancel?.();
    });
    gameTasks.clear();
  }

  const wait = (ms) => new Promise((resolve) => scheduleGameTask(resolve, ms, resolve));

  return {
    gameTasks,
    scheduleGameTask,
    pauseGameTasks,
    resumeGameTasks,
    clearGameTasks,
    wait
  };
}
