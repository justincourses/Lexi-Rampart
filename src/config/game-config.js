const difficulties = {
  veteran: {
    name: '萌新', subtitle: '稳健守城', pressure: 1.1, eliteOffset: -.03, eliteCap: .93,
    statScale: 1.08, durabilityScale: 1.35, speedFactor: 1.12, groupScale: .9, batchDivisor: 4,
    enemyRelicChance: .018, enemyRelicGrowth: .0004, enemyRelicCapPerWave: 3,
    runeRelicChance: .02, scoreScale: 1.5, infinite: true
  },
  master: {
    name: '大佬', subtitle: '九死一生', pressure: 1.38, eliteOffset: .16, eliteCap: .99,
    statScale: 1.28, durabilityScale: 1.55, speedFactor: 1.28, groupScale: 1.12, batchDivisor: 2,
    enemyRelicChance: 0, enemyRelicGrowth: 0, enemyRelicCapPerWave: 0,
    runeRelicChance: .006, scoreScale: 2, infinite: true
  },
  endless: {
    name: '老兵', subtitle: '久经沙场', pressure: 1.18, eliteOffset: .04, eliteCap: .96,
    statScale: 1.14, durabilityScale: 1.42, speedFactor: 1.17, groupScale: .95, batchDivisor: 4,
    enemyRelicChance: .006, enemyRelicGrowth: .00015, enemyRelicCapPerWave: 1,
    runeRelicChance: .014, scoreScale: 1.75, infinite: true
  }
};

Object.values(difficulties).forEach(Object.freeze);
export const GAME_CONFIG = Object.freeze({
  defaultDifficulty: 'veteran',
  difficulties: Object.freeze(difficulties)
});

if (typeof window !== 'undefined') {
  window.LEXI_RAMPART_CONFIG = GAME_CONFIG;
}
