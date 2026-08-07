import { COLS } from './constants.js';

export const indexOf = (row, col) => row * COLS + col;
export const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
export const safeNumber = (value, fallback, minimum = -Infinity, maximum = Infinity) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, minimum, maximum) : fallback;
};

export function formatBattleTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
