# Agent / 本地开发说明

## Node 版本

- 要求：`package.json` → `engines.node` 为 `>=22.0.0`
- **不要**在仓库放 `.nvmrc`：Cloudflare Pages 会读取它，且不支持 `lts/*` / `lts/jod` 这类写法，会导致构建失败
- 本地用 **nvm** 安装并切换 Node，避免系统自带的旧 Node：

```bash
nvm install 22
nvm use 22
node -v   # 应 >= 22
npm install
```

- Cloudflare Pages：在控制台环境变量设置 `NODE_VERSION=22`（不要依赖 `.nvmrc`）

## 常用命令

```bash
npm run dev       # Vite 开发服务器
npm run build     # 产出 dist/
npm run preview   # 本地预览 dist，端口 4173
npm run deploy    # build 后 wrangler pages deploy
```

## 约定

- 入口：`src/main.js`（Vite）→ `src/game/runtime.js` 的 `startGame()`
- 模块划分（扩展新功能优先改对应文件，勿把逻辑堆回 runtime）：
  - `src/config/game-config.js` — 难度配置
  - `src/game/constants.js` — 常量/表
  - `src/game/music-tracks.js` — 曲目数据
  - `src/game/storage.js` — localStorage 读写
  - `src/game/utils.js` — 纯工具
  - `src/game/match-logic.js` — 三消纯逻辑（可单测）
  - `src/game/combat-math.js` — 波次/军械/平衡纯公式（可单测）
  - `src/game/tasks.js` — 可暂停任务调度
  - `src/game/shared.js` — 运行时共享袋 `g`
  - `src/game/dom.js` / `layout.js` / `audio.js` / `state.js` — DOM、适配、音频、状态
  - `src/game/tooltip.js` / `history.js` / `save.js` — 提示、战报、存档
  - `src/game/math-bridge.js` / `board.js` / `combat-stats.js` / `combat.js` — 数值桥、棋盘、战斗
  - `src/game/hud.js` / `ui.js` / `events.js` / `boot.js` — HUD、界面、事件、启动
  - `src/game/runtime.js` — 按依赖顺序 `attach*` 组装
- 领域模块通过 `attachX()` 往 `g` 挂方法；跨模块调用一律 `g.xxx`
- 静态音效在 `public/assets/`
- 不要把游戏主循环改成 Vue/React 组件；后续框架扩展时保持 client-only 原生逻辑
- 测试钩子 `window.__runeRampartTest` 与 localStorage key 勿随意改名
