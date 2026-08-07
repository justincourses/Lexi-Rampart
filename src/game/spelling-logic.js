export const ALPHABET = Object.freeze('QWERTYUIOPASDFGHJKLZXCVBNM'.split(''));
export const RUNE_REWARD_TYPES = Object.freeze(['ember', 'mana', 'moss', 'coin']);
export const CEFR_WEIGHTS = Object.freeze({ A1: 0, A2: .25, B1: .6, B2: .9, C1: 1.25, C2: 1.6 });

export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function hiddenCountFor(word, difficulty = 'veteran', random = Math.random) {
  const length = String(word).length;
  let range = length <= 4 ? [1, 1] : length <= 7 ? [1, 2] : length <= 10 ? [2, 3] : [3, 3];
  const maximum = Math.min(range[1], Math.max(1, length - 2));
  const minimum = Math.min(range[0], maximum);
  if (minimum === maximum) return minimum;
  const highChance = difficulty === 'master' ? .8 : difficulty === 'endless' ? .5 : .2;
  return random() < highChance ? maximum : minimum;
}

export function chooseHiddenIndices(word, count, random = Math.random, previousEdge = '') {
  const length = String(word).length;
  const indices = Array.from({ length }, (_, index) => index);
  let candidates = shuffled(indices, random);
  if (previousEdge === 'start') candidates = candidates.sort((a, b) => (a === 0) - (b === 0));
  if (previousEdge === 'end') candidates = candidates.sort((a, b) => (a === length - 1) - (b === length - 1));
  return candidates.slice(0, Math.min(count, Math.max(1, length - 2))).sort((a, b) => a - b);
}

export function createSpellingRound(entry, difficulty = 'veteran', runeType = 'ember', random = Math.random, previousEdge = '') {
  const word = String(entry?.word || '').toLowerCase();
  const level = String(entry?.level || 'A1').toUpperCase();
  const hiddenCount = hiddenCountFor(word, difficulty, random);
  const hiddenIndices = chooseHiddenIndices(word, hiddenCount, random, previousEdge);
  return {
    word,
    level,
    hiddenIndices,
    filledIndices: [],
    errors: 0,
    status: 'playing',
    runeType,
    runeAmount: rewardAmountFor({ word, level, hiddenIndices }),
    lastInput: '',
    lastResult: ''
  };
}

export function rewardAmountFor(round) {
  const challenge = (CEFR_WEIGHTS[round.level] || 0)
    + Math.max(0, round.word.length - 4) * .12
    + Math.max(0, round.hiddenIndices.length - 1) * .75;
  return challenge >= 2.45 ? 3 : challenge >= 1.05 ? 2 : 1;
}

export function scoreForRound(round, difficultyScoreScale = 1) {
  const accuracy = [1, .8, .5][Math.min(2, Math.max(0, round.errors))];
  const challenge = 55
    + round.word.length * 7
    + round.hiddenIndices.length * 32
    + (CEFR_WEIGHTS[round.level] || 0) * 55;
  const firstTryBonus = round.errors === 0 ? 35 : 0;
  return Math.round((challenge * accuracy + firstTryBonus) * difficultyScoreScale);
}

export function nextMissingIndex(round) {
  return round.hiddenIndices.find((index) => !round.filledIndices.includes(index)) ?? -1;
}

export function applyLetterToRound(round, letter) {
  if (!round || round.status !== 'playing') return { kind: 'ignored', round };
  const normalized = String(letter || '').toLowerCase();
  if (!/^[a-z]$/.test(normalized)) return { kind: 'ignored', round };
  const index = nextMissingIndex(round);
  if (index < 0) return { kind: 'ignored', round };
  if (round.word[index] === normalized) {
    const filledIndices = [...round.filledIndices, index].sort((a, b) => a - b);
    const completed = filledIndices.length === round.hiddenIndices.length;
    return {
      kind: completed ? 'completed' : 'correct',
      round: { ...round, filledIndices, status: completed ? 'completed' : 'playing', lastInput: normalized, lastResult: 'correct' }
    };
  }
  const errors = round.errors + 1;
  const failed = errors >= 3;
  return {
    kind: failed ? 'failed' : 'wrong',
    round: { ...round, errors, status: failed ? 'revealed' : 'playing', lastInput: normalized, lastResult: 'wrong' }
  };
}

export function isValidSpellingRound(round, allowedEntries = []) {
  if (!round || typeof round.word !== 'string' || !/^[a-z]{3,12}$/.test(round.word)) return false;
  if (allowedEntries.length && !allowedEntries.some((entry) => entry.word === round.word && entry.level === round.level)) return false;
  if (!Array.isArray(round.hiddenIndices) || !round.hiddenIndices.length || round.hiddenIndices.length > 3) return false;
  if (new Set(round.hiddenIndices).size !== round.hiddenIndices.length) return false;
  if (round.word.length - round.hiddenIndices.length < 2) return false;
  if (round.hiddenIndices.some((index) => !Number.isInteger(index) || index < 0 || index >= round.word.length)) return false;
  if (!Array.isArray(round.filledIndices) || new Set(round.filledIndices).size !== round.filledIndices.length || round.filledIndices.some((index) => !round.hiddenIndices.includes(index))) return false;
  if (!Number.isInteger(round.errors) || round.errors < 0 || round.errors > 3) return false;
  if (!RUNE_REWARD_TYPES.includes(round.runeType) || ![1, 2, 3].includes(round.runeAmount)) return false;
  return ['playing', 'completed', 'revealed'].includes(round.status);
}
