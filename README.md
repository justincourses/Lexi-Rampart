# 词垒守卫（Lexi Rampart）

「词垒守卫」是一款 **英语单词补全 × 实时塔防** 浏览器小游戏。玩家按顺序补全单词中的缺失字母，赢取余烬、奥能、修复与补强符文，同时让弩炮自动迎击不断增强的敌潮。

- 玩法说明：[docs/gameplay.md](./docs/gameplay.md)
- 改造设计：[docs/english-spelling-defense-design.md](./docs/english-spelling-defense-design.md)
- 仓库：<https://github.com/justincourses/Lexi-Rampart>

词库按 A1–C2 拆分并随游戏静态发布，分级仅参考 CEFR，不代表官方认证或完整教学体系。游戏没有在线词典请求，因此可以离线运行核心玩法。

## 核心玩法

1. 系统从当前难度的洗牌词袋中抽取单词，并隐藏 1–3 个字母。
2. 玩家点击 QWERTY 排列的字母区，或直接按实体键盘字母，从左到右补全空位。
3. 正确字母会锁定；第三次错误会揭示答案并自动换词，本题不提供奖励。
4. 答对后尝试使用系统英语语音朗读，并结算预告的符文与军功。
5. 符文继续驱动自动攻击、奥术齐射、城墙修复和军械升级；补词时战场不会暂停。

三档难度同时影响词库和塔防压力：萌新为 A1–A2，老兵为 B1–B2，大佬为 C1–C2。更完整的规则、符文换算和存档说明见 [玩法文档](./docs/gameplay.md)。

## 本地运行

要求 **Node.js ≥ 22**（见 `package.json` → `engines.node`）。本地请用 nvm 切换版本，不要在仓库添加 `.nvmrc`；Cloudflare Pages 应设置环境变量 `NODE_VERSION=22`。

```bash
nvm install 22
nvm use 22
npm install
npm run dev
```

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 构建 `dist/` 并校验发布产物 |
| `npm run preview` | 在 `127.0.0.1:4173` 预览生产构建 |
| `npm test` | 运行纯逻辑单元测试 |
| `npm run test:browser` | 运行 Playwright 浏览器冒烟 |
| `npm run deploy` | 构建并部署到 Cloudflare Pages 项目 `lexi-rampart` |

## 项目结构

入口是 `src/main.js` → `src/game/runtime.js` 的 `startGame()`。领域模块使用 `attachX()` 往共享袋 `g` 挂载方法，跨模块调用统一使用 `g.xxx`。

| 路径 | 职责 |
| --- | --- |
| `src/data/words-*.json` | A1–C2 六档静态词库 |
| `src/game/word-lists.js` | 词库装载与难度映射 |
| `src/game/spelling-logic.js` | 隐藏位置、输入判定、奖励和存档校验纯逻辑 |
| `src/game/spelling.js` | 补词界面、洗牌袋、语音与战斗奖励桥接 |
| `src/game/combat-math.js` | 波次、军械和战斗平衡纯公式 |
| `src/game/combat.js` / `combat-stats.js` | 敌军、攻击、资源消费和数值展示 |
| `src/game/save.js` / `history.js` | 本地战局存档与战报 |
| `src/game/hud.js` / `ui.js` / `events.js` | HUD、界面状态和输入事件 |
| `src/game/audio.js` / `music-tracks.js` | 音效、系统朗读和 MIDI 军乐 |
| `index.html` / `styles.css` | 页面结构、品牌 meta 与视觉样式 |

原三消模块暂留在仓库中作为迁移历史和纯逻辑测试素材，但不再由主输入事件驱动。新玩法逻辑不要回堆到 `runtime.js` 或战斗模块。

## 存档兼容

- 保留现有 `window.__runeRampartTest` 测试入口和 `runeRampart.*` localStorage key，避免外部测试与用户设置失效。
- 补词改造将战局存档版本提升到 v2；旧版三消战局无法可靠映射为当前单词，因此首次读取时会被清除，难度、音效、军乐与历史战报仍使用原 key。
- 新存档包含当前单词、等级、隐藏/已填位置、错误次数、词袋、符文袋、奖励，以及原有波次、敌军、资源与装备状态。

## 测试

```bash
npm test
npm run build
npm run test:browser
```

改动补词逻辑时至少覆盖：隐藏数量、至少两个可见字母、输入顺序、三错揭示、奖励分档、洗牌袋与存档恢复。改动战斗或发布流程时再运行对应的浏览器和部署冒烟脚本。

## Cloudflare Pages

项目名已更新为 `lexi-rampart`。首次配置：

```bash
npx wrangler login
npx wrangler pages project create lexi-rampart --production-branch main
npm run deploy
```

默认探活地址为 <https://lexi-rampart.pages.dev/>。如果使用自定义域名，可通过 `DEPLOY_CHECK_URL` 指定发布校验地址。

哈希 JS/CSS 位于 `/_app/` 并长期缓存；HTML 和 `asset-manifest.json` 始终重新验证。入口资源版本错位时会自动刷新一次，仍失败才显示手动重新载入界面。

## 资源许可

战斗音效来自 [Kenney](https://kenney.nl/)，使用 CC0：

- [Kenney UI Audio](https://kenney.nl/assets/ui-audio)
- [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds)

系统朗读使用浏览器 `SpeechSynthesisUtterance`，实际语音和口音取决于用户设备。词库为项目内静态整理列表；若后续引入外部数据集，应在发布前复核数据与上游许可。
