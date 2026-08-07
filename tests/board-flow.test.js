import test from 'node:test';
import assert from 'node:assert/strict';
import { createActor } from 'xstate';
import { boardFlowMachine, resolutionFromBoardFlow } from '../src/game/board-flow.js';

function createBoardFlow() {
  return createActor(boardFlowMachine).start();
}

test('swap validation can revert and reset without changing the public resolution contract', () => {
  const actor = createBoardFlow();
  assert.equal(resolutionFromBoardFlow(actor.getSnapshot()), null);
  actor.send({ type: 'SWAP', first: 10, second: 11, sessionId: 3 });
  assert.deepEqual(resolutionFromBoardFlow(actor.getSnapshot()), {
    kind: 'swap', phase: 'validate', first: 10, second: 11
  });
  actor.send({ type: 'REVERT' });
  assert.deepEqual(resolutionFromBoardFlow(actor.getSnapshot()), {
    kind: 'swap', phase: 'reverting', first: 10, second: 11
  });
  actor.send({ type: 'RESET' });
  assert.equal(resolutionFromBoardFlow(actor.getSnapshot()), null);
  actor.stop();
});

test('resolve flow follows matching, primed, burst and dropping phases', () => {
  const actor = createBoardFlow();
  actor.send({ type: 'RESOLVE', sessionId: 9 });
  const expected = [
    ['resolveMatching', 'matching', 'PRIME'],
    ['resolvePrimed', 'primed', 'BURST'],
    ['resolveBurst', 'burst', 'DROP'],
    ['resolveDropping', 'dropping', 'NEXT']
  ];
  expected.forEach(([value, phase, nextEvent]) => {
    assert.equal(actor.getSnapshot().value, value);
    assert.deepEqual(resolutionFromBoardFlow(actor.getSnapshot()), { kind: 'resolve', phase });
    actor.send({ type: nextEvent });
  });
  assert.equal(actor.getSnapshot().value, 'resolveMatching');
  actor.send({ type: 'RESET' });
  assert.equal(resolutionFromBoardFlow(actor.getSnapshot()), null);
  actor.stop();
});

test('validated swap can enter resolution directly', () => {
  const actor = createBoardFlow();
  actor.send({ type: 'SWAP', first: 1, second: 8, sessionId: 12 });
  actor.send({ type: 'RESOLVE', sessionId: 12 });
  assert.deepEqual(resolutionFromBoardFlow(actor.getSnapshot()), { kind: 'resolve', phase: 'matching' });
  actor.stop();
});
