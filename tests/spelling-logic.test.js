import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALPHABET,
  applyLetterToRound,
  chooseHiddenIndices,
  createSpellingRound,
  hiddenCountFor,
  isValidSpellingRound,
  rewardAmountFor,
  scoreForRound,
  shuffled
} from '../src/game/spelling-logic.js';

test('the on-screen alphabet follows three-row QWERTY order', () => {
  assert.equal(ALPHABET.join(''), 'QWERTYUIOPASDFGHJKLZXCVBNM');
});

test('difficulty biases longer words toward more missing letters while keeping two visible', () => {
  assert.equal(hiddenCountFor('planet', 'veteran', () => .3), 1);
  assert.equal(hiddenCountFor('planet', 'master', () => .3), 2);
  assert.equal(hiddenCountFor('formidable', 'master', () => .1), 3);
  assert.equal(hiddenCountFor('cat', 'master', () => .1), 1);

  ['cat', 'planet', 'formidable'].forEach((word) => {
    const count = hiddenCountFor(word, 'master', () => .1);
    const indices = chooseHiddenIndices(word, count, () => .42);
    assert.ok(word.length - indices.length >= 2);
    assert.equal(new Set(indices).size, indices.length);
  });
});

test('letters fill missing positions from left to right and lock correct answers', () => {
  const round = {
    word: 'defense', level: 'B1', hiddenIndices: [1, 3, 6], filledIndices: [],
    errors: 0, status: 'playing', runeType: 'mana', runeAmount: 2, lastInput: ''
  };
  const first = applyLetterToRound(round, 'e');
  assert.equal(first.kind, 'correct');
  assert.deepEqual(first.round.filledIndices, [1]);

  const wrong = applyLetterToRound(first.round, 'x');
  assert.equal(wrong.kind, 'wrong');
  assert.equal(wrong.round.errors, 1);
  assert.deepEqual(wrong.round.filledIndices, [1]);

  const second = applyLetterToRound(wrong.round, 'e');
  const completed = applyLetterToRound(second.round, 'e');
  assert.equal(completed.kind, 'completed');
  assert.deepEqual(completed.round.filledIndices, [1, 3, 6]);
});

test('the third wrong letter reveals the answer without clearing correct letters', () => {
  const base = {
    word: 'castle', level: 'A2', hiddenIndices: [1, 4], filledIndices: [1],
    errors: 2, status: 'playing', runeType: 'coin', runeAmount: 1, lastInput: ''
  };
  const result = applyLetterToRound(base, 'x');
  assert.equal(result.kind, 'failed');
  assert.equal(result.round.status, 'revealed');
  assert.equal(result.round.errors, 3);
  assert.deepEqual(result.round.filledIndices, [1]);
});

test('challenge and accuracy determine reward and score', () => {
  const easy = createSpellingRound({ word: 'book', level: 'A1' }, 'veteran', 'ember', () => .9);
  const hard = { ...createSpellingRound({ word: 'unambiguous', level: 'C2' }, 'master', 'mana', () => .1), hiddenIndices: [1, 4, 8] };
  assert.equal(rewardAmountFor(easy), 1);
  assert.equal(rewardAmountFor(hard), 3);
  assert.ok(scoreForRound(hard, 2) > scoreForRound(easy, 1.5));
  assert.ok(scoreForRound({ ...hard, errors: 0 }, 2) > scoreForRound({ ...hard, errors: 2 }, 2));
});

test('round validation rejects unknown words and malformed saved positions', () => {
  const entries = [{ word: 'apple', level: 'A1' }];
  const valid = {
    word: 'apple', level: 'A1', hiddenIndices: [1], filledIndices: [], errors: 0,
    status: 'playing', runeType: 'moss', runeAmount: 1, lastInput: ''
  };
  assert.equal(isValidSpellingRound(valid, entries), true);
  assert.equal(isValidSpellingRound({ ...valid, word: 'unknown' }, entries), false);
  assert.equal(isValidSpellingRound({ ...valid, hiddenIndices: [9] }, entries), false);
});

test('shuffle bags preserve every entry exactly once per cycle', () => {
  const source = ['A', 'B', 'C', 'D'];
  const bag = shuffled(source, () => .25);
  assert.deepEqual([...bag].sort(), source);
});
