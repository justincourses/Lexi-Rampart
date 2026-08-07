import test from 'node:test';
import assert from 'node:assert/strict';

import { DIFFICULTIES, MAX_SUPPORTED_WAVE } from '../src/game/constants.js';
import {
  formatWaveProgress,
  getWaveProfile,
  isEndlessDifficulty,
  normalizeWave,
  waveLimitForDifficulty
} from '../src/game/combat-math.js';

const difficultyKeys = ['veteran', 'master', 'endless'];

test('every difficulty uses infinite defense without a configured victory wave', () => {
  difficultyKeys.forEach((key) => {
    assert.equal(DIFFICULTIES[key].infinite, true);
    assert.equal('waveLimit' in DIFFICULTIES[key], false);
    assert.equal(isEndlessDifficulty(key), true);
    assert.equal(waveLimitForDifficulty(key), MAX_SUPPORTED_WAVE);
    assert.equal(normalizeWave(101, key), 101);
    assert.equal(normalizeWave(100_000, key), 100_000);
  });
});

test('wave labels show only the current wave', () => {
  assert.equal(formatWaveProgress(5, 'veteran'), '5');
  assert.equal(formatWaveProgress(5, 'master', true), '005');
  assert.equal(formatWaveProgress(101, 'endless', true), '101');
});

test('all difficulty curves continue after wave 100 with bounded battlefield density', () => {
  difficultyKeys.forEach((key) => {
    const wave100 = getWaveProfile(100, key);
    const wave101 = getWaveProfile(101, key);
    const densityCeiling = getWaveProfile(240, key);
    const lateWave = getWaveProfile(100_000, key);

    assert.equal(wave100.isBossWave, true);
    assert.equal(wave101.wave, 101);
    assert.equal(wave101.isBossWave, false);
    assert.ok(wave101.hpScale > wave100.hpScale);
    assert.equal(lateWave.wave, 100_000);
    assert.equal(lateWave.enemyCount, densityCeiling.enemyCount);
    assert.equal(lateWave.requiredGroups, densityCeiling.requiredGroups);
    assert.ok(lateWave.hpScale > densityCeiling.hpScale);
    assert.ok(lateWave.batchSize <= 8);
  });
});

test('waves 1–10 are a runway before stronger per-wave and ten-wave jumps', () => {
  difficultyKeys.forEach((key) => {
    const profiles = Array.from({ length: 31 }, (_, index) => getWaveProfile(index + 1, key));
    profiles.forEach((profile, index) => {
      if (index === 0) return;
      const previous = profiles[index - 1];
      assert.ok(profile.hpScale > previous.hpScale, `${key} hp should grow on wave ${profile.wave}`);
      assert.ok(profile.damageScale > previous.damageScale, `${key} damage should grow on wave ${profile.wave}`);
      assert.ok(profile.defenseScale > previous.defenseScale, `${key} defense should grow on wave ${profile.wave}`);
      assert.ok(profile.speedScale > previous.speedScale, `${key} speed should grow on wave ${profile.wave}`);
    });

    const openingMicroJump = profiles[8].intensity / profiles[7].intensity;
    const firstStageJump = profiles[10].intensity / profiles[9].intensity;
    const secondStageJump = profiles[20].intensity / profiles[19].intensity;
    assert.ok(profiles[0].intensity < profiles[9].intensity);
    assert.ok(firstStageJump > openingMicroJump * 1.1);
    assert.ok(secondStageJump > openingMicroJump * 1.1);
  });
});

test('enemy relics use strict per-wave caps while board relic rates stay unchanged', () => {
  const profiles = Object.fromEntries(difficultyKeys.map((key) => [key, getWaveProfile(100, key)]));
  assert.deepEqual(
    Object.fromEntries(difficultyKeys.map((key) => [key, profiles[key].enemyRelicCapPerWave])),
    { veteran: 3, master: 0, endless: 1 }
  );
  assert.ok(profiles.veteran.enemyRelicChance < .025);
  assert.ok(profiles.endless.enemyRelicChance < .01);
  assert.equal(profiles.master.enemyRelicChance, 0);
  assert.deepEqual(
    Object.fromEntries(difficultyKeys.map((key) => [key, profiles[key].runeRelicChance])),
    { veteran: .02, master: .006, endless: .014 }
  );
});
