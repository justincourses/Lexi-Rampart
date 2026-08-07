# 贡献指南

感谢关注「词垒守卫」。本文说明如何在本仓库安全、一致地开发与提交改动。更细的模块地图见 [`AGENTS.md`](./AGENTS.md)，开发与部署概览见 [`README.md`](./README.md)，玩法说明见 [`docs/gameplay.md`](./docs/gameplay.md)。

## 行为与范围

- 优先小步、可验证的改动；避免无关重构与大范围格式化。
- 保持 **client-only 原生游戏循环**：不要把主逻辑改成 Vue / React 等 SPA 框架组件树。
- 新增能力时改对应领域模块，**不要把逻辑堆回 `src/game/runtime.js`**。
- 若改动会改变难度曲线、存档形状或对外测试钩子，请在 PR 中明确写出兼容策略。

## 环境准备

| 要求 | 说明 |
| --- | --- |
| Node.js | `>= 22.0.0`（`package.json` → `engines`） |
| 包管理 | 本仓库使用 npm（`packageManager` 字段已锁定主版本） |
| nvm | 推荐用 nvm 切换 Node；**不要**提交 `.nvmrc` |

Cloudflare Pages 不支持 `lts/*` 等形式的 `.nvmrc`，误提交会导致线上构建失败。Pages 侧请用环境变量 `NODE_VERSION=22`。

```bash
nvm install 22
nvm use 22
node -v    # 应 >= 22
npm install
npm run dev
```

开发服务器默认 <http://localhost:5173>。生产预览：

```bash
npm run build
npm run preview   # http://127.0.0.1:4173
```

## 分支与提交

1. 从最新的目标分支（通常是 `dev` 或 `main`）拉取并创建主题分支，例如：
   - `fix/save-checkpoint`
   - `feat/relic-hud`
   - `docs/readme`
2. 提交信息写清「改了什么、为什么」，中英文均可，保持完整句子。
3. 推送后开 Pull Request，说明：
   - 动机与用户可见影响
   - 测试如何验证（命令 + 手动步骤）
   - 是否触及存档、难度、部署缓存或测试钩子

不强制特定 commit 前缀，但请避免把无关文件（截图噪音、`dist/`、本机配置）带进 PR。

## 代码约定

### 入口与组装

- 入口：`src/main.js` → `src/game/runtime.js` 的 `startGame()`
- 领域模块通过 `attachX(…)` 往共享袋 `g` 挂方法
- 跨模块调用一律使用 `g.xxx`，不要绕过 `g` 直接互相 import 运行时副作用（纯函数模块除外）

### 改哪里

| 目标 | 优先修改 |
| --- | --- |
| 难度参数 | `src/config/game-config.js` |
| 常量 / 存档 key / 装备表 | `src/game/constants.js` |
| 补词判定与奖励 | `src/game/spelling-logic.js` |
| 词库与难度映射 | `src/game/word-lists.js`、`src/data/words-*.json` |
| 波次、军械、补强公式 | `src/game/combat-math.js` |
| 补词输入与界面 | `src/game/spelling.js` |
| 动画驱动 | `src/game/animation.js`（Motion；保留 CSS 回退） |
| 战斗表现 | `combat.js`、`combat-stats.js` |
| 存档与续战 | `save.js`、`storage.js`、`history.js` |
| HUD / 界面 / 事件 | `hud.js`、`ui.js`、`events.js` |
| 静态音效 | `public/assets/` |

能抽成纯函数并单测的逻辑，优先放在 `spelling-logic.js`、`combat-math.js` 等文件。

### 不可随意改动的契约

- **`window.__runeRampartTest`**：浏览器冒烟与回归依赖，勿改名或删除公开字段。
- **`STORAGE_KEYS` 与 localStorage 形状**：改动需提供迁移逻辑，并覆盖续战 / 重开路径。
- **发布资源路径**：构建产物 JS/CSS 在 `/_app/`；`asset-manifest.json`、HTML 内 build id、`public/_headers` 与 `scripts/verify-*.mjs` 共同保证零停机切换，改部署链路时需同步校验脚本。
- **动画回退**：URL 或环境可走 CSS 路径（`animationDriver=css` / `ANIMATION_DRIVER=css`）。改 Motion 路径时请同时考虑回退与 `prefers-reduced-motion`。

### 风格

- 现有代码以简洁 ES 模块为主；新增代码对齐邻近文件风格即可。
- 不要引入未在 `package.json` 声明的运行时依赖；若确需新依赖，在 PR 中说明体积与回滚方式。
- 游戏文案与 HUD 以中文为主，与现有界面一致。

## 测试

提交前至少保证相关层级通过。

### 单元测试

```bash
npm test
# 等同
npm run test:unit
```

对应 `tests/*.test.js`（Node 内置 `node --test`）。修改纯逻辑时请补充或更新用例。

### 浏览器测试

依赖 Playwright（已在 `devDependencies`）。首次使用如需安装浏览器，按 Playwright 提示执行即可。

```bash
npm run test:browser
npm run test:migration-browser
npm run test:migration-browser:css
```

- 改交互、存档、布局、难度时：优先跑 `test:browser`
- 改补词动画、暂停恢复时：跑浏览器冒烟与存档恢复检查

### 构建与部署产物

```bash
npm run build          # 含 scripts/verify-dist.mjs
npm run preview
node tests/deployment_smoke.js   # 可选：资源恢复引导
```

涉及 `index.html` 资源恢复、`_headers`、manifest 或 deploy 脚本时，务必通过 `verify-dist` 与 deployment smoke。

### 手动抽查清单（按改动勾选）

- [ ] 桌面端交换 / 拖拽无效回弹
- [ ] 正确/错误/揭示反馈与符文数字、HUD `+N`/`-N`
- [ ] 余烬开火与奥术齐射（`Q`）
- [ ] 暂停 / `Esc` / 切后台再回来
- [ ] 刷新后续战、重新部署清档
- [ ] 三档难度开局与战役选项重开
- [ ] 移动端横屏可玩、竖屏提示（如触及布局）
- [ ] 音效与 MIDI 开关

## Pull Request 检查清单

- [ ] 分支基于最新目标分支，冲突已处理
- [ ] 只包含与主题相关的 diff
- [ ] `npm test` 通过；相关浏览器测试已跑或说明无法跑的原因
- [ ] `npm run build` 通过（若改了前端或构建配置）
- [ ] 更新了用户可见文档（`README.md` 玩法/命令）或协作者文档（`AGENTS.md` / 本文）——如有必要
- [ ] 未提交 `.nvmrc`、密钥、本机路径或无关 `test-output/` 截图（除非 PR 明确需要）

## 文档与调研

- 开发 / 部署 / 命令：更新 `README.md`
- 玩法、难度与操作说明：更新 `docs/gameplay.md`
- 协作者 / Agent 约定：更新 `AGENTS.md`
- 较大架构选型：可写入 `docs/`（参考现有 runtime 现代化调研），并在 PR 链接该文档

## 发布（维护者）

日常贡献者一般 **不需要** 直接 `npm run deploy`。维护者发布时：

1. 确认目标分支已合并且 CI/本地测试通过
2. 已 `wrangler login`，Pages 项目 `lexi-rampart` 可用
3. Pages 环境变量 `NODE_VERSION=22`
4. 执行：

```bash
npm run deploy
# 或自定义探活
DEPLOY_CHECK_URL=https://你的域名/ npm run deploy
```

`deploy` 会构建、保留线上哈希资源、上传 `dist/` 并探活。不要对 HTML 开启长时间 Edge 缓存；仅 `/_app/*` 适合 immutable 长缓存。

## 问题反馈

- Bug：尽量附带浏览器、难度、波次、能否稳定复现，以及控制台报错
- 平衡建议：说明难度档、大致波次与操作节奏，便于对照 `game-config.js` / `combat-math.js`
- 安全或依赖告警：注明是否仅影响 `devDependencies`（例如 wrangler 工具链）

再次感谢你的贡献。
