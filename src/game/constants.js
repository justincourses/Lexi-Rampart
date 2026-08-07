import { GAME_CONFIG } from '../config/game-config.js';

export const ROWS = 7;
export const COLS = 7;
export const DEFAULT_DIFFICULTY = GAME_CONFIG.defaultDifficulty;
export const SECONDARY_BOLT_POWER = .45;
export const EMBER_BASE_CAP = 24;
export const EMBER_CAP_PER_WEAPON_LEVEL = 4;
export const MANA_BASE_CAP = 54;
export const MANA_CAP_PER_CHARM_LEVEL = 9;
export const MANA_CAST_COST = 18;
export const EMBER_DAMAGE_MULTIPLIER = 1.25;
export const SHIELD_MAX_RATIO = .5;
export const ARMOR_WALL_BONUS = 90;
export const ARMOR_SHIELD_BONUS = Math.round(ARMOR_WALL_BONUS * SHIELD_MAX_RATIO);
export const WAVE_INTERMISSION_MS = 3000;
export const MAX_SAFE_GAME_INTEGER = Number.MAX_SAFE_INTEGER;
// This is a serialization/math safety guard, not a reachable gameplay victory cap.
export const MAX_SUPPORTED_WAVE = MAX_SAFE_GAME_INTEGER;
export const MAX_EQUIPMENT_LEVEL = 1_000_000_000;
export const SWAP_ANIMATION_MS = 190;
export const CASCADE_SETTLEMENT_COMPLETE_MS = 650;
export const RUNE_DRAG_INTERACTION = Object.freeze({
  intentSlop: 7,
  axisSwitchRatio: 1.3,
  directionReverseSlop: 8,
  armRatio: 1 / 3,
  minimumArmDistance: 8,
  maximumPreviewRatio: 1,
  blockedDragRatio: .18,
  blockedDragMaximum: 8,
  rejectedReturnMs: 95,
  settleMinimumMs: 70,
  settleMaximumMs: 150
});
export const MATCH_RESOLUTION_TIMING = Object.freeze({
  normal: Object.freeze({ prime: 120, burst: 150, drop: 200, dropRowStagger: 5, dropColStagger: 2 }),
  linked: Object.freeze({ prime: 55, burst: 150, drop: 200, dropRowStagger: 5, dropColStagger: 2 })
});
export const RUNE_BURST_LIMITS = Object.freeze({
  standard: Object.freeze({ firstParticles: 3, comboParticles: 2, firstMaximum: 24, comboMaximum: 14, activeLayers: 2 }),
  constrained: Object.freeze({ firstParticles: 2, comboParticles: 1, firstMaximum: 14, comboMaximum: 8, activeLayers: 1 })
});
export const FORGE_START = 26;
export const FORGE_LEVEL_STEP = 10;
export const FORGE_LATE_STEP = 2;
export const FORGE_EARLY_LEVELS = 4;
export const UPGRADE_SLOTS = ['weapon', 'armor', 'charm'];
export const ENEMY_ENTRY_X = 98;
export const TARGET_ACQUIRE_DELAY = 220;
export const SAVE_VERSION = 2;
export const STORAGE_KEYS = {
  difficulty: 'runeRampart.difficulty',
  muted: 'runeRampart.muted',
  music: 'runeRampart.music',
  musicTrack: 'runeRampart.musicTrack',
  progress: 'runeRampart.progress.v1',
  history: 'runeRampart.history.v1'
};
export const HISTORY_LIMIT = 30;
export const HISTORY_VISIBLE_LIMIT = 8;
export const DIFFICULTY_PRIORITY = { veteran: 1, endless: 2, master: 3 };
export const TYPES = ['ember', 'mana', 'moss', 'coin'];
export const SYMBOLS = { ember: '◆', mana: '✦', moss: '⬟', coin: '●' };
export const TYPE_NAMES = { ember: '红曜石', mana: '蓝晶', moss: '绿晶', coin: '铸币' };
export const EQUIPMENT = {
  weapon: ['新兵弩', '余烬连弩', '雷鸣弩机', '星落投射器', '王城裁决者'],
  armor: ['橡木城栅', '铆铁壁垒', '符文城墙', '永恒堡垒', '不落王垒'],
  charm: ['斥候号角', '疾风徽记', '时序沙漏', '龙心军旗', '苍穹战鼓']
};
export const ENEMY_NAMES = {
  raider: ['裂齿·格鲁', '灰旗·乌桑', '断刃·柯勒', '荒牙·莫克', '红疤·伊戈'],
  swift: ['影足·希芙', '夜鸦·涅拉', '风刃·卡西', '薄雾·洛萨', '疾影·薇恩'],
  assault: ['血斧·卡戎', '猎城·萨迦', '断誓·罗铎', '赤刃·弥沙', '战吼·赫娅'],
  brute: ['铁颚·巴图', '碎墙·葛恩', '铜背·沃尔', '独眼·赫山', '重槌·鲁格'],
  boss: ['焚城者·戈摩', '不屈巨兽·塔恩', '王旗终结者·穆拉']
};
export const DIFFICULTIES = GAME_CONFIG.difficulties;
export const BASE_ENEMY_STATS = {
  raider: { hp: 100, speed: 3, damage: 28, defense: 3, role: '荒原劫掠者 · 均衡型', roleIcon: '◆' },
  swift: { hp: 70, speed: 5.4, damage: 18, defense: 1, role: '影袭斥候 · 速度型', roleIcon: '»' },
  assault: { hp: 120, speed: 3.5, damage: 44, defense: 2, role: '血斧先锋 · 攻击型', roleIcon: '†' },
  brute: { hp: 210, speed: 2, damage: 32, defense: 13, role: '披甲蛮兵 · 防御型', roleIcon: '◇' },
  boss: { hp: 1050, speed: 1.4, damage: 96, defense: 20, role: '攻城巨兽 · BOSS', roleIcon: '♛' }
};
export const RELICS = {
  blast: { name: '爆裂符文', icon: '✹', description: '命中产生范围伤害', className: 'blast' },
  frost: { name: '霜缚符文', icon: '❄', description: '命中减慢敌军', className: 'frost' },
  shatter: { name: '破甲符文', icon: '⌁', description: '命中削弱防御', className: 'shatter' }
};
export const COMPACT_LANDSCAPE_CANVAS_WIDTH = 1180;
