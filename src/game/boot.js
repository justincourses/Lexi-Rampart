import { g } from './shared.js';
import { STORAGE_KEYS, DEFAULT_DIFFICULTY } from './constants.js';
import { readStorage } from './storage.js';

export function attachBoot() {
  const storedDifficulty = readStorage(STORAGE_KEYS.difficulty, DEFAULT_DIFFICULTY);
  const initialDifficulty = g.normalizeDifficultyKey(storedDifficulty);
  g.state.selectedDifficulty = initialDifficulty;
  g.state.difficulty = initialDifficulty;
  g.settlementHistory = g.readHistory();
  g.prepareSpellingRound();
  g.selectDifficulty(initialDifficulty, false);
  g.setUpgradeMode('auto', false);
  g.updateSoundButton();
  g.updateMusicButton();
  g.updateFullscreenButton();
  g.updateUI();
  g.scheduleGameFit();
  const savedProgress = g.readSavedProgress();
  if (savedProgress) g.showResumePrompt(savedProgress);
  else g.els.introModal.classList.add('is-first-visit');

}
