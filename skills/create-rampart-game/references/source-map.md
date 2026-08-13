# Source map and evidence protocol

Use this map to find evidence quickly. Verify every path against the selected source revision because the repository can evolve.

## Minimum source audit

Read these before planning either track:

| File | What it establishes |
| --- | --- |
| `AGENTS.md` | Local agent constraints, Node policy, module ownership, protected contracts |
| `package.json` | Engines, package manager, scripts, exact dependencies |
| `README.md` | Current product loop, commands, high-level structure, save and deployment notes |
| `CONTRIBUTING.md` | Change discipline, verification ladder, protected release contracts |
| `docs/gameplay.md` | Current player-visible rules and terminology |
| `src/game/runtime.js` | Actual composition order and active domain modules |
| `index.html` | Semantic page structure, overlays, controls, brand meta, asset recovery bootstrap |
| `styles.css` | Actual visual tokens, layout, states, motion, breakpoints, reduced-motion handling |

Run the bundled audit script for a fast inventory, then read source directly:

```bash
node skills/create-rampart-game/scripts/audit-rampart.mjs /path/to/Lexi-Rampart
```

The script is read-only. Its report helps detect drift but does not interpret behavior.

## Feature routing

| Task | Primary source | Read with |
| --- | --- | --- |
| Difficulty names and pressure multipliers | `src/config/game-config.js` | `constants.js`, `combat-math.js`, difficulty UI in `index.html` |
| Global constants and public compatibility names | `src/game/constants.js` | tests and save code that consume them |
| Word data and level mapping | `src/data/words-*.json`, `src/game/word-lists.js` | `spelling-logic.js`, `docs/gameplay.md` |
| Spelling rule, hiding, rewards, scoring, validation | `src/game/spelling-logic.js` | `tests/spelling-logic.test.js` |
| Spelling runtime and feedback | `src/game/spelling.js` | `events.js`, `hud.js`, `styles.css`, browser smoke |
| Waves, equipment, capacities, damage, balance simulation | `src/game/combat-math.js` | `math-bridge.js`, `combat-stats.js`, `tests/combat-math.test.js` |
| Enemy runtime, targeting, projectiles, breach, loop | `src/game/combat.js` | `combat-stats.js`, `hud.js`, browser smoke |
| State defaults | `src/game/state.js` | reset and restore paths in `ui.js` and `save.js` |
| Save, migration, sanitization, resume | `src/game/save.js`, `storage.js` | `constants.js`, `history.js`, browser smoke |
| Pausable delayed work | `src/game/tasks.js`, `tasks-attach.js` | `ui.js`, all scheduled effects |
| Motion registry and CSS fallback | `src/game/animation.js` | animation consumers, CSS keyframes, migration smoke |
| Bounded XState workflow | `src/game/board-flow.js` | `board.js`, `tests/board-flow.test.js` |
| Pointer gesture math | `src/game/gesture.js` | `board.js`, `events.js`, `tests/gesture.test.js` |
| DOM lookup ownership | `src/game/dom.js` | IDs in `index.html` |
| Responsive fit and orientation | `src/game/layout.js` | CSS breakpoints and browser smoke |
| Audio, speech, and music | `src/game/audio.js`, `music-tracks.js` | settings in `events.js`/`ui.js`, assets and licenses |
| HUD and contextual information | `src/game/hud.js`, `tooltip.js` | `index.html`, `styles.css` |
| Modal, pause, reset, fullscreen | `src/game/ui.js` | `events.js`, `tasks.js`, `animation.js`, `save.js` |
| Test hook and user events | `src/game/events.js` | every field exposed through `window.__runeRampartTest` |
| Boot order and resume prompt | `src/game/boot.js` | runtime order and save code |
| Release manifest and hashed assets | `vite.config.js` | `scripts/verify-dist.mjs`, `preserve-live-assets.mjs`, `_headers` |
| Cloudflare deploy configuration | `wrangler.jsonc`, `package.json` | deployment and live verification scripts |

## Current and legacy paths

The current primary input is spelling. `board.js`, `board-flow.js`, `match-logic.js`, gesture code, and related tests remain in the repository from the match-three era and runtime modernization work. They still inform useful patterns—pure rules, Pointer Events, cancellable animation, XState projection—but do not assume they drive the current game without tracing imports and event listeners.

## Test routing

- Pure spelling rules: `tests/spelling-logic.test.js`
- Balance and infinite-wave formulas: `tests/combat-math.test.js`
- Match-three state machine compatibility: `tests/board-flow.test.js`
- Gesture model: `tests/gesture.test.js`
- Active spelling integration: `tests/spelling_browser_smoke.js`
- Broader browser and legacy interaction: `tests/browser_smoke.js`
- Runtime import/migration shape: `tests/runtime_migration_smoke.js`
- Release artifact and recovery: `tests/deployment_smoke.js`, `scripts/verify-dist.mjs`

Choose tests based on impact. Do not run only a legacy test for a current spelling change.

## Evidence ledger

For each material decision, record:

| Decision | Source path and symbol/section | Observation | Inference | Planned consequence |
| --- | --- | --- | --- | --- |

An observation should be directly supported by current source. An inference explains why that fact matters. This separation prevents an old design document from being mistaken for live behavior.

## Online fallback

If local source is absent or the user chooses upstream:

1. Open <https://github.com/justincourses/Lexi-Rampart>.
2. Note the default branch and commit used.
3. Read raw file content for the minimum audit and relevant feature routes.
4. Prefer repository files over search snippets or third-party summaries.
5. If access is incomplete, state which evidence is missing before making irreversible or high-risk changes.

If both local and online source exist, never silently mix revisions. Explain divergence and use the source selected by the user.
