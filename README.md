# 符文守护（Rune Rampart）

「符文守护」是一款 **三消 × 塔防** 浏览器小游戏：在 7×7 棋盘上交换相邻符文，用消除所得资源守住城墙，抵御无限波次敌军。

- 在线试玩：<https://rune-rampart.pages.dev/>
- 玩法说明：[docs/gameplay.md](./docs/gameplay.md)
- 仓库：<https://github.com/interjc/rune-rampart>

**技术栈**：原生 DOM 游戏逻辑 + [Vite](https://vitejs.dev/) 构建；动画与局部棋盘流程分别使用 [Motion](https://motion.dev/) 与 [XState](https://stately.ai/docs/xstate)；部署到 [Cloudflare Pages](https://pages.cloudflare.com/)。

> 主循环保持 client-only 原生实现，**不要**改成 Vue/React 组件树。模块约定见 [`AGENTS.md`](./AGENTS.md)，贡献流程见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 目录

- [本地运行](#本地运行)
- [项目结构](#项目结构)
- [测试](#测试)
- [发布到 Cloudflare Pages](#发布到-cloudflare-pages)
- [文档与贡献](#文档与贡献)
- [资源许可](#资源许可)

## 本地运行

要求 **Node.js ≥ 22**（见 `package.json` → `engines.node`）。请用 nvm 管理本地 Node，**不要**在仓库添加 `.nvmrc`（Cloudflare Pages 会读取它，且不支持 `lts/*` 等写法）。

```bash
nvm install 22
nvm use 22
node -v   # 应 >= 22
npm install
npm run dev
```

开发服务器默认：<http://localhost:5173>。也可使用 `./dev.sh`（等价于 `npm i && npm run dev`）。

生产构建与预览（冒烟测试默认连 4173 端口）：

```bash
npm run build
npm run preview
```

预览地址：<http://127.0.0.1:4173>。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | 产出 `dist/`，并运行产物校验 |
| `npm run preview` | 本地预览 `dist/`（`127.0.0.1:4173`） |
| `npm test` / `npm run test:unit` | 纯逻辑单元测试 |
| `npm run test:browser` | Playwright 浏览器冒烟 |
| `npm run test:migration-browser` | Motion / 暂停恢复等迁移回归 |
| `npm run test:migration-browser:css` | 同上，强制 CSS 动画回退路径 |
| `npm run deploy` | 构建 → 保留线上哈希资源 → 部署 → 探活 |

## 项目结构

```
├── index.html              # 页面结构与资源恢复引导
├── styles.css              # 布局、战场与动画样式
├── vite.config.js          # 开发 / 构建（输出 dist/，资源目录 _app/）
├── wrangler.jsonc          # Cloudflare Pages 项目配置
├── package.json            # 脚本、engines、依赖
├── public/
│   ├── _headers            # 入口 revalidate + /_app/* 长期缓存
│   └── assets/             # 音效等静态资源（构建原样拷贝）
├── src/
│   ├── main.js             # Vite 入口 → startGame()
│   ├── config/
│   │   └── game-config.js  # 三档无限防御难度参数
│   └── game/               # 领域模块（见下表）
├── scripts/                # 产物校验、线上资源保留、部署探活
├── tests/                  # 单元测试与 Playwright 冒烟
├── docs/                   # 玩法、调研与设计文档
├── AGENTS.md               # 本地 Node 与模块约定（给协作者 / Agent）
└── CONTRIBUTING.md         # 贡献指南
```

### 游戏模块（`src/game/`）

入口：`src/main.js` → `runtime.js` 的 `startGame()`。领域模块通过 `attachX()` 往共享袋 `g` 挂方法，跨模块调用一律 `g.xxx`。

| 文件 | 职责 |
| --- | --- |
| `runtime.js` | 按依赖顺序组装 `attach*` |
| `shared.js` | 运行时共享袋 `g` |
| `constants.js` | 常量、表、`STORAGE_KEYS` |
| `match-logic.js` | 三消纯逻辑（可单测） |
| `combat-math.js` | 波次 / 军械 / 平衡纯公式（可单测） |
| `gesture.js` | 拖拽手势纯模型（可单测） |
| `board-flow.js` | 棋盘流程（XState actor） |
| `animation.js` | 动画 registry（Motion / CSS 回退） |
| `board.js` / `combat.js` / `combat-stats.js` | 棋盘、战斗与数值展示 |
| `save.js` / `storage.js` / `history.js` | 存档、localStorage、战报 |
| `hud.js` / `ui.js` / `events.js` / `boot.js` | HUD、界面、事件、启动 |
| `dom.js` / `layout.js` / `audio.js` / `state.js` | DOM、适配、音频、状态 |
| `tasks.js` / `tasks-attach.js` | 可暂停任务调度 |
| `music-tracks.js` | MIDI 曲目数据 |
| `tooltip.js` / `helpers.js` / `utils.js` / `math-bridge.js` | 提示、辅助、工具、数值桥 |

纯逻辑优先放在 `match-logic.js`、`combat-math.js`、`gesture.js` 等可单测文件，**不要把新逻辑堆回 `runtime.js`**。

生产依赖：

- `motion` — 交换、回弹、投射物等逻辑耦合动画
- `xstate` — 局部棋盘流程状态机（不替代全局 `g.state`）

开发依赖：`vite`、`wrangler`、`playwright`。

### 实现契约（改动时注意）

- **`window.__runeRampartTest`**：浏览器冒烟与回归依赖，勿改名或删除公开字段。
- **`STORAGE_KEYS` 与 localStorage 形状**：改动需提供迁移；玩法侧说明见 [docs/gameplay.md](./docs/gameplay.md#本地存档与续战)。
- **发布资源路径**：哈希 JS/CSS 在 `/_app/`；与 `asset-manifest.json`、`public/_headers`、`scripts/verify-*.mjs` 联动，保证版本切换不白屏。
- **动画回退**：Motion 主路径需同时考虑 CSS 回退（`animationDriver=css` / `ANIMATION_DRIVER=css`）与 `prefers-reduced-motion`。

## 测试

```bash
# 单元测试（Node 内置 test runner）
npm test

# 浏览器冒烟
npm run test:browser

# 运行时迁移回归（Motion 主路径 / CSS 回退）
npm run test:migration-browser
npm run test:migration-browser:css
```

发布兼容检查（需先 `npm run preview` 或等价静态服务）：

```bash
node tests/deployment_smoke.js
```

会模拟主脚本首次加载失败与持续失败，确认自动恢复一次，并在无法恢复时停止重试、显示可操作的重新载入界面。

更完整的测试要求与手动清单见 [CONTRIBUTING.md](./CONTRIBUTING.md#测试)。

## 发布到 Cloudflare Pages

项目通过 `wrangler.jsonc` 配置 Pages，项目名 `rune-rampart`。`npm run build` 用 Vite 生成 `dist/`：仅包含浏览器运行所需的 HTML、CSS、JS 与静态资源。带内容哈希的 JS/CSS 位于 `/_app/`，可长期缓存；HTML 与 `asset-manifest.json` 始终重新验证。

发布流程会：

1. 构建并校验 `dist/`
2. 保留当前线上版本的哈希资源（避免新旧切换白屏）
3. `wrangler pages deploy`
4. 探活生产入口、构建编号与新资源

页面检测到资源版本错位时会自动刷新一次；仍失败则显示重新载入按钮。本地 `localStorage` 战局存档不会因刷新清除。

### 首次配置

Cloudflare Pages 控制台请设置环境变量 **`NODE_VERSION=22`**（不要依赖 `.nvmrc`）。

```bash
nvm install 22 && nvm use 22
npm install
npx wrangler login
npx wrangler pages project create rune-rampart --production-branch main
```

### 部署

```bash
npm run deploy
```

默认探活：`https://rune-rampart.pages.dev/`。自定义域名可指定：

```bash
DEPLOY_CHECK_URL=https://你的域名/ npm run deploy
```

自定义域名不要为 HTML 配置 `Cache Everything` 或较长的 Edge TTL；如需 Cache Rule，只应长期缓存 `/_app/*`。

分支预览：

```bash
npm run build
npx wrangler pages deploy ./dist --project-name rune-rampart --branch <BRANCH_NAME>
```

> Wrangler Direct Upload 项目之后不能直接切换为 Pages Git 集成。若需要 GitHub/GitLab 自动部署，请新建采用 Git 集成的 Pages 项目。

## 文档与贡献

| 文档 | 内容 |
| --- | --- |
| [docs/gameplay.md](./docs/gameplay.md) | 玩法、难度、敌军、操作、存档说明 |
| [docs/game-runtime-modernization-research.md](./docs/game-runtime-modernization-research.md) | 运行时现代化调研与选型 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 环境、分支、模块边界、测试与 PR |
| [AGENTS.md](./AGENTS.md) | Node 版本与 `src/game` 模块约定 |

欢迎通过 Issue 与 Pull Request 参与。日常贡献请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 资源许可

战斗音效来自 [Kenney](https://kenney.nl/)，Creative Commons **CC0**：

- [Kenney UI Audio](https://kenney.nl/assets/ui-audio)
- [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds)

许可原文：`public/assets/audio/ui/License.txt`、`public/assets/audio/impact/License.txt`。背景音乐为 Web Audio 实时合成，无外部 MIDI 播放器依赖。
