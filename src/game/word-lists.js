import wordsA1 from '../data/words-a1.json' with { type: 'json' };
import wordsA2 from '../data/words-a2.json' with { type: 'json' };
import wordsB1 from '../data/words-b1.json' with { type: 'json' };
import wordsB2 from '../data/words-b2.json' with { type: 'json' };
import wordsC1 from '../data/words-c1.json' with { type: 'json' };
import wordsC2 from '../data/words-c2.json' with { type: 'json' };

export const WORD_LISTS = Object.freeze({
  A1: Object.freeze(wordsA1),
  A2: Object.freeze(wordsA2),
  B1: Object.freeze(wordsB1),
  B2: Object.freeze(wordsB2),
  C1: Object.freeze(wordsC1),
  C2: Object.freeze(wordsC2)
});

export const WORD_LEVELS_BY_DIFFICULTY = Object.freeze({
  veteran: Object.freeze(['A1', 'A2']),
  endless: Object.freeze(['B1', 'B2']),
  master: Object.freeze(['C1', 'C2'])
});

export function wordEntriesForDifficulty(difficulty) {
  const levels = WORD_LEVELS_BY_DIFFICULTY[difficulty] || WORD_LEVELS_BY_DIFFICULTY.veteran;
  return levels.flatMap((level) => WORD_LISTS[level].map((word) => ({ word, level })));
}
