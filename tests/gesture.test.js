import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceRuneGestureIntent, applyRuneGesturePreview, createRuneGestureState, runeDragTargetIndex
} from '../src/game/gesture.js';

test('runeDragTargetIndex respects board edges', () => {
  assert.equal(runeDragTargetIndex(0, 'x', -1), null);
  assert.equal(runeDragTargetIndex(0, 'y', -1), null);
  assert.equal(runeDragTargetIndex(6, 'x', 1), null);
  assert.equal(runeDragTargetIndex(48, 'y', 1), null);
  assert.equal(runeDragTargetIndex(24, 'x', 1), 25);
  assert.equal(runeDragTargetIndex(24, 'y', -1), 17);
});

test('pointer scale is converted to layout distance before arming', () => {
  const initial = createRuneGestureState({ startIndex: 24, startX: 100, startY: 100, pointerScale: 2 });
  const intent = advanceRuneGestureIntent(initial, 140, 100);
  const preview = applyRuneGesturePreview(intent, 60);
  assert.equal(intent.layoutDistance, 20);
  assert.equal(preview.previewProgress, 1 / 3);
  assert.equal(preview.armed, true);
  assert.equal(preview.lockedTargetIndex, 25);
});

test('axis can switch before arming and locks after arming', () => {
  const initial = createRuneGestureState({ startIndex: 24, startX: 0, startY: 0 });
  const horizontal = advanceRuneGestureIntent(initial, 12, 2);
  assert.equal(horizontal.axis, 'x');
  const vertical = advanceRuneGestureIntent(horizontal, 5, 24);
  assert.equal(vertical.axis, 'y');
  assert.equal(vertical.targetIndex, 31);

  const armed = applyRuneGesturePreview(vertical, 40);
  assert.equal(armed.armed, true);
  const afterCrossAxisMove = advanceRuneGestureIntent(armed, 40, 25);
  assert.equal(afterCrossAxisMove.axis, 'y');
  assert.equal(afterCrossAxisMove.targetIndex, 31);
});

test('direction can reverse before arming and blocked drags stay bounded', () => {
  const initial = createRuneGestureState({ startIndex: 21, startX: 50, startY: 50 });
  const right = advanceRuneGestureIntent(initial, 62, 50);
  const left = advanceRuneGestureIntent(right, 34, 50);
  assert.equal(left.direction, -1);
  assert.equal(left.targetIndex, null);
  const blocked = applyRuneGesturePreview({ ...left, layoutDistance: 100 }, 0);
  assert.equal(blocked.blockedDistance, 8);
  assert.equal(blocked.armed, false);
});
