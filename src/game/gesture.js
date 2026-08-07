import { ROWS, COLS, RUNE_DRAG_INTERACTION } from './constants.js';

/** Resolve a single orthogonal neighbour from a locked drag axis and direction. */
export function runeDragTargetIndex(startIndex, axis, direction, { rows = ROWS, cols = COLS } = {}) {
  const row = Math.floor(startIndex / cols);
  const col = startIndex % cols;
  if (axis === 'x') {
    if (direction > 0 && col < cols - 1) return startIndex + 1;
    if (direction < 0 && col > 0) return startIndex - 1;
    return null;
  }
  if (axis === 'y') {
    if (direction > 0 && row < rows - 1) return startIndex + cols;
    if (direction < 0 && row > 0) return startIndex - cols;
  }
  return null;
}

export function createRuneGestureState({ startIndex, startX, startY, pointerScale = 1 }) {
  return {
    startIndex,
    startX,
    startY,
    pointerScale: Math.max(.01, pointerScale || 1),
    targetIndex: null,
    lockedTargetIndex: null,
    previewProgress: 0,
    layoutDistance: 0,
    axis: null,
    direction: 0,
    moved: false,
    armed: false
  };
}

/**
 * Convert pointer coordinates into a DOM-independent drag intent. The returned
 * object is immutable so this logic can be tested without a browser.
 */
export function advanceRuneGestureIntent(
  gesture,
  clientX,
  clientY,
  { interaction = RUNE_DRAG_INTERACTION, rows = ROWS, cols = COLS } = {}
) {
  const next = { ...gesture };
  const deltaX = clientX - next.startX;
  const deltaY = clientY - next.startY;
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);
  const pointerDistance = Math.hypot(deltaX, deltaY);
  next.moved = next.moved || pointerDistance >= interaction.intentSlop;

  if (!next.armed && !next.axis && pointerDistance >= interaction.intentSlop) {
    next.axis = absoluteX >= absoluteY ? 'x' : 'y';
  } else if (!next.armed && next.axis) {
    const primaryDistance = next.axis === 'x' ? absoluteX : absoluteY;
    const crossDistance = next.axis === 'x' ? absoluteY : absoluteX;
    if (crossDistance >= interaction.intentSlop
      && crossDistance > primaryDistance * interaction.axisSwitchRatio) {
      next.axis = next.axis === 'x' ? 'y' : 'x';
      next.direction = 0;
    }
  }

  const axisDelta = next.axis === 'x' ? deltaX : next.axis === 'y' ? deltaY : 0;
  const direction = Math.sign(axisDelta);
  if (!next.armed && !next.direction && direction) next.direction = direction;
  else if (!next.armed && direction && direction !== next.direction
    && Math.abs(axisDelta) >= interaction.directionReverseSlop) {
    next.direction = direction;
  }

  const directedDistance = Math.max(0, axisDelta * next.direction);
  next.layoutDistance = directedDistance / next.pointerScale;
  const targetIndex = next.lockedTargetIndex ?? runeDragTargetIndex(
    next.startIndex,
    next.axis,
    next.direction,
    { rows, cols }
  );
  if (next.targetIndex !== targetIndex) {
    next.armed = false;
    next.previewProgress = 0;
  }
  next.targetIndex = targetIndex;
  return next;
}

/** Add tile geometry to an intent and decide preview progress/commit arming. */
export function applyRuneGesturePreview(
  gesture,
  targetDistance,
  { interaction = RUNE_DRAG_INTERACTION } = {}
) {
  const next = { ...gesture };
  if (next.targetIndex === null || !targetDistance) {
    next.armed = false;
    next.previewProgress = 0;
    next.blockedDistance = Math.min(
      interaction.blockedDragMaximum,
      next.layoutDistance * interaction.blockedDragRatio
    );
    return next;
  }

  next.blockedDistance = 0;
  next.previewProgress = Math.min(
    interaction.maximumPreviewRatio,
    Math.max(0, next.layoutDistance / targetDistance)
  );
  const armThreshold = Math.max(
    interaction.minimumArmDistance,
    targetDistance * interaction.armRatio
  );
  if (!next.armed && next.layoutDistance >= armThreshold) {
    next.armed = true;
    next.lockedTargetIndex = next.targetIndex;
  }
  return next;
}
