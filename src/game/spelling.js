import { g } from './shared.js';
import { SYMBOLS, TYPE_NAMES } from './constants.js';
import { wordEntriesForDifficulty, WORD_LEVELS_BY_DIFFICULTY } from './word-lists.js';
import {
  ALPHABET, RUNE_REWARD_TYPES, applyLetterToRound, createSpellingRound,
  isValidSpellingRound, scoreForRound, shuffled
} from './spelling-logic.js';

const ERROR_MESSAGES = ['再看一眼空位', '还剩最后一次机会', '答案已揭示'];

export function attachSpelling() {
  function refillWordBag() {
    g.state.wordBag = shuffled(wordEntriesForDifficulty(g.state.difficulty).map(({ word, level }) => `${level}:${word}`));
  }

  function takeWordEntry() {
    if (!g.state.wordBag.length) g.refillWordBag();
    const [level, word] = String(g.state.wordBag.shift()).split(':');
    return { level, word };
  }

  function refillRuneBag() {
    g.state.runeBag = shuffled(RUNE_REWARD_TYPES);
  }

  function takeRuneType() {
    if (!g.state.runeBag.length) g.refillRuneBag();
    return g.state.runeBag.shift();
  }

  function prepareSpellingRound({ render = true } = {}) {
    const entry = g.takeWordEntry();
    g.state.spellingRound = createSpellingRound(
      entry,
      g.state.difficulty,
      g.takeRuneType(),
      Math.random,
      g.state.previousHiddenEdge
    );
    const { hiddenIndices, word } = g.state.spellingRound;
    g.state.previousHiddenEdge = hiddenIndices.includes(0)
      ? 'start'
      : hiddenIndices.includes(word.length - 1) ? 'end' : '';
    g.state.locked = false;
    if (render) g.renderSpelling();
    return g.state.spellingRound;
  }

  function resetSpelling() {
    g.state.wordBag = [];
    g.state.runeBag = [];
    g.state.previousHiddenEdge = '';
    g.state.correctStreak = 0;
    g.state.combo = 0;
    return g.prepareSpellingRound();
  }

  function rewardLabel(round = g.state.spellingRound) {
    if (!round) return '待命';
    return `${SYMBOLS[round.runeType]} ${TYPE_NAMES[round.runeType]} ×${round.rewardedAmount ?? round.runeAmount}`;
  }

  function renderSpelling() {
    const round = g.state.spellingRound;
    if (!round) return;
    const levels = WORD_LEVELS_BY_DIFFICULTY[g.state.difficulty] || WORD_LEVELS_BY_DIFFICULTY.veteran;
    g.$('#wordLevel').textContent = `${levels.join('–')} · 本题 ${round.level}`;
    g.$('#wordReward').textContent = g.rewardLabel(round);
    g.$('#wordReward').className = `word-reward ${round.runeType}`;

    const prompt = g.$('#wordPrompt');
    prompt.replaceChildren();
    [...round.word].forEach((letter, index) => {
      const slot = document.createElement('span');
      const hidden = round.hiddenIndices.includes(index);
      const filled = round.filledIndices.includes(index);
      slot.className = hidden ? `word-slot is-missing${filled ? ' is-filled' : ''}` : 'word-slot';
      if (round.status === 'revealed' && hidden && !filled) slot.classList.add('is-revealed');
      slot.textContent = !hidden || filled || round.status === 'revealed' ? letter.toUpperCase() : '_';
      slot.setAttribute('aria-label', !hidden || filled || round.status === 'revealed' ? letter : '空位');
      prompt.appendChild(slot);
    });

    document.querySelectorAll('.mistake-mark').forEach((mark, index) => {
      mark.classList.toggle('is-used', index < round.errors);
    });
    const alphabet = g.$('#alphabetGrid');
    if (!alphabet.children.length) {
      const fragment = document.createDocumentFragment();
      ALPHABET.forEach((letter) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'letter-button';
        button.dataset.letter = letter;
        button.textContent = letter;
        button.setAttribute('aria-label', `填入字母 ${letter}`);
        fragment.appendChild(button);
      });
      alphabet.appendChild(fragment);
    }
    alphabet.querySelectorAll('.letter-button').forEach((button) => {
      button.disabled = g.state.paused || g.state.locked || g.state.gameOver || !g.state.started;
      button.classList.toggle('is-last-wrong', round.lastResult === 'wrong' && round.lastInput === button.dataset.letter.toLowerCase() && round.status !== 'completed');
    });

    const status = g.$('#wordStatus');
    status.className = `word-status is-${round.status}`;
    if (round.status === 'completed') status.textContent = `正确！${round.word.toUpperCase()} · ${g.rewardLabel(round)}`;
    else if (round.status === 'revealed') status.textContent = `答案：${round.word.toUpperCase()} · 本题无奖励`;
    else if (round.errors) status.textContent = ERROR_MESSAGES[round.errors - 1];
    else status.textContent = '按空位顺序选择字母';
  }

  function createSpellingBurst(type) {
    const layer = document.createElement('div');
    layer.className = 'rune-burst-layer spelling-burst';
    for (let index = 0; index < 12; index += 1) {
      const spark = document.createElement('i');
      const angle = Math.PI * 2 * index / 12;
      const distance = 35 + Math.random() * 55;
      spark.className = `rune-spark ${type}`;
      spark.style.left = '50%';
      spark.style.top = '38%';
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      layer.appendChild(spark);
    }
    g.els.boardEffects.appendChild(layer);
    g.scheduleGameTask(() => layer.remove(), 850);
  }

  function speakWord(word) {
    if (g.sound.muted || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find((voice) => /^en-(US|GB)/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang)) || null;
      utterance.lang = utterance.voice?.lang || 'en-US';
      utterance.rate = .82;
      utterance.volume = .72;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // Pronunciation is optional feedback and must never block the next round.
    }
  }

  function applySpellingReward(round) {
    const amount = round.rewardedAmount ?? (round.errors === 2 ? Math.max(1, round.runeAmount - 1) : round.runeAmount);
    const score = scoreForRound(round, g.difficultyConfig().scoreScale);
    g.state.score += score;
    g.state.waveWords += 1;
    g.state.totalWords += 1;
    g.state.correctStreak = round.errors === 0 ? g.state.correctStreak + 1 : 0;
    g.state.combo = g.state.correctStreak;
    g.updateCombo();

    if (round.runeType === 'ember') {
      const previous = g.state.emberCharges;
      g.state.emberCharges = Math.min(g.emberCapacity(), g.state.emberCharges + amount);
      const accepted = g.state.emberCharges - previous;
      g.pulseResource('ember', accepted ? `+${accepted}` : '已满');
      g.showCombatToast(accepted ? `余烬 +${accepted}` : '余烬已满', 'damage', 26, 32);
    } else if (round.runeType === 'mana') {
      const previous = g.state.mana;
      g.state.mana = Math.min(g.manaCapacity(), g.state.mana + amount * 4);
      const accepted = g.state.mana - previous;
      g.pulseResource('mana', accepted ? `+${accepted}` : '已满');
      g.showCombatToast(accepted ? `奥能 +${accepted}` : '奥能已满', 'mana', 39, 24);
    } else if (round.runeType === 'moss') {
      g.applyMossSupport(amount * 18);
    } else {
      const reinforcement = amount * 3;
      g.state.forge += reinforcement;
      g.pulseResource('coin', `+${reinforcement}`);
      g.pulseForgeMeter();
      g.showCombatToast(`补强 +${reinforcement}`, 'forge', 73, 32);
      g.checkForge();
    }
    g.addLog(`补全 ${round.word.toUpperCase()}（${round.level}），获得 ${g.rewardLabel({ ...round, runeAmount: amount })} 与 ${score} 军功`);
    g.createSpellingBurst(round.runeType);
    g.updateUI();
  }

  function handleLetter(letter) {
    if (!g.state.started || g.state.paused || g.state.locked || g.state.gameOver) return false;
    const result = applyLetterToRound(g.state.spellingRound, letter);
    if (result.kind === 'ignored') return false;
    g.state.spellingRound = result.round;
    if (result.kind === 'correct') {
      g.sound.play('click', .18, 1.32);
      g.sound.tone(392, .11, 'triangle', .032);
    } else if (result.kind === 'wrong') {
      g.state.correctStreak = 0;
      g.state.combo = 0;
      g.updateCombo();
      g.sound.play('denied', .22, .86);
    } else if (result.kind === 'completed') {
      g.state.locked = true;
      result.round = {
        ...result.round,
        rewardedAmount: result.round.errors === 2 ? Math.max(1, result.round.runeAmount - 1) : result.round.runeAmount
      };
      g.state.spellingRound = result.round;
      g.sound.play('match', .3, 1.08);
      g.sound.tone(523, .18, 'triangle', .04);
      g.sound.tone(659, .22, 'sine', .032, .08);
      g.applySpellingReward(result.round);
      g.speakWord(result.round.word);
      g.scheduleGameTask(() => g.prepareSpellingRound(), 900);
    } else if (result.kind === 'failed') {
      g.state.locked = true;
      g.state.correctStreak = 0;
      g.state.combo = 0;
      g.updateCombo();
      g.sound.play('denied', .3, .72);
      g.addLog(`${result.round.word.toUpperCase()} 已揭示，本题不提供符文或军功`);
      g.scheduleGameTask(() => g.prepareSpellingRound(), 1000);
    }
    g.renderSpelling();
    return true;
  }

  function restoreSpellingRound(round, wordBag = [], runeBag = []) {
    const entries = wordEntriesForDifficulty(g.state.difficulty);
    if (!isValidSpellingRound(round, entries)) return false;
    g.state.spellingRound = { ...round, hiddenIndices: [...round.hiddenIndices], filledIndices: [...round.filledIndices] };
    const allowedKeys = new Set(entries.map(({ word, level }) => `${level}:${word}`));
    g.state.wordBag = Array.isArray(wordBag) ? wordBag.filter((key) => allowedKeys.has(key)) : [];
    g.state.runeBag = Array.isArray(runeBag) ? runeBag.filter((type) => RUNE_REWARD_TYPES.includes(type)) : [];
    if (round.status !== 'playing') g.prepareSpellingRound({ render: false });
    g.state.locked = false;
    return true;
  }

  g.refillWordBag = refillWordBag;
  g.takeWordEntry = takeWordEntry;
  g.refillRuneBag = refillRuneBag;
  g.takeRuneType = takeRuneType;
  g.prepareSpellingRound = prepareSpellingRound;
  g.resetSpelling = resetSpelling;
  g.rewardLabel = rewardLabel;
  g.renderSpelling = renderSpelling;
  g.createSpellingBurst = createSpellingBurst;
  g.speakWord = speakWord;
  g.applySpellingReward = applySpellingReward;
  g.handleLetter = handleLetter;
  g.restoreSpellingRound = restoreSpellingRound;
}
