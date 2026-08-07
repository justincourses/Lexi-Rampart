import { ROWS, COLS } from './constants.js';
import { indexOf } from './utils.js';

export function findMatchesOnBoard(board) {
  const matches = new Set();
  for (let row = 0; row < ROWS; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= COLS; col += 1) {
      const current = col < COLS ? board[indexOf(row, col)] : null;
      const previous = board[indexOf(row, col - 1)];
      if (current !== previous) {
        if (previous && col - runStart >= 3) {
          for (let x = runStart; x < col; x += 1) matches.add(indexOf(row, x));
        }
        runStart = col;
      }
    }
  }
  for (let col = 0; col < COLS; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= ROWS; row += 1) {
      const current = row < ROWS ? board[indexOf(row, col)] : null;
      const previous = board[indexOf(row - 1, col)];
      if (current !== previous) {
        if (previous && row - runStart >= 3) {
          for (let y = runStart; y < row; y += 1) matches.add(indexOf(y, col));
        }
        runStart = row;
      }
    }
  }
  return matches;
}

export function findMatchGroupsOnBoard(board) {
  const groups = [];
  for (let row = 0; row < ROWS; row += 1) {
    let run = 1;
    for (let col = 1; col <= COLS; col += 1) {
      const current = col < COLS ? board[indexOf(row, col)] : null;
      const previous = board[indexOf(row, col - 1)];
      if (current && current === previous) run += 1;
      else {
        if (previous && run >= 3) groups.push({ type: previous, length: run });
        run = 1;
      }
    }
  }
  for (let col = 0; col < COLS; col += 1) {
    let run = 1;
    for (let row = 1; row <= ROWS; row += 1) {
      const current = row < ROWS ? board[indexOf(row, col)] : null;
      const previous = board[indexOf(row - 1, col)];
      if (current && current === previous) run += 1;
      else {
        if (previous && run >= 3) groups.push({ type: previous, length: run });
        run = 1;
      }
    }
  }
  return groups;
}

export function findMatchesAfterSwapOnBoard(board, first, second) {
  if (!tilesAreAdjacent(first, second)) return new Set();
  const candidate = [...board];
  [candidate[first], candidate[second]] = [candidate[second], candidate[first]];
  return findMatchesOnBoard(candidate);
}

export function hasPossibleMoveOnBoard(board) {
  for (let index = 0; index < board.length; index += 1) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    for (const next of [col < COLS - 1 ? index + 1 : -1, row < ROWS - 1 ? index + COLS : -1]) {
      if (next < 0) continue;
      if (findMatchesAfterSwapOnBoard(board, index, next).size > 0) return true;
    }
  }
  return false;
}

export function tilesAreAdjacent(first, second) {
  const firstRow = Math.floor(first / COLS);
  const firstCol = first % COLS;
  const secondRow = Math.floor(second / COLS);
  const secondCol = second % COLS;
  return Math.abs(firstRow - secondRow) + Math.abs(firstCol - secondCol) === 1;
}

export function adjacentTileIndices(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  return [
    row > 0 ? index - COLS : null,
    col < COLS - 1 ? index + 1 : null,
    row < ROWS - 1 ? index + COLS : null,
    col > 0 ? index - 1 : null
  ].filter((candidate) => candidate !== null);
}
