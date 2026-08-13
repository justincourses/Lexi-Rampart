# Architecture and engineering baseline

This is a navigation and decision guide, not frozen truth. Verify versions and behavior in the selected source revision.

## Baseline stack

At the 2026-08-13 local snapshot:

- Node.js `>=22.0.0`, npm, Vite 6;
- native ES modules and semantic DOM;
- Motion 12 through `motion/mini` for selected logic-coupled animation;
- XState 5 for the bounded legacy board workflow;
- Playwright for browser smoke tests and Node's built-in test runner for pure logic;
- Cloudflare Pages/Wrangler for hosting and release verification;
- no React, Vue, Phaser, PixiJS, server application, account system, or cloud save.

Always read `package.json` for the current versions.

## Composition root

`src/main.js` calls `startGame()` in `src/game/runtime.js`. The runtime imports a shared bag `g` and invokes `attachX()` functions in dependency order. Each domain attaches runtime methods to `g`; cross-domain runtime calls use `g.xxx`.

The current order expresses real dependencies:

```text
DOM → layout → audio → state → tooltip → tasks → animation
→ board flow → helpers → history → save → math bridge
→ legacy board → spelling → combat stats → HUD → combat
→ UI → events → boot
```

The composition root should remain boring. Add behavior to the owning domain module and add only the necessary attach call in `runtime.js`.

### Why this pattern is worth preserving

- It keeps a native, client-only runtime while avoiding one monolithic script.
- It makes assembly order visible without introducing a component framework.
- It permits pure modules to remain independent of `g` and the DOM.
- It supports incremental modernization and small rollback points.

The cost is that `g` is a shared mutable namespace. Keep ownership explicit, avoid ambiguous method names, and do not bypass domain boundaries with new side-effect imports.

## Pure logic versus runtime effects

Pure, directly testable examples:

- `spelling-logic.js`: shuffle bags, hidden counts/indices, round creation, input transition, reward/score, save validation;
- `combat-math.js`: equipment cost/power/capacity, difficulty normalization, wave profiles, damage, balance simulation;
- `gesture.js`: pointer intent, scale normalization, axis/direction state;
- `match-logic.js`: legacy match detection.

Runtime effect modules use `g` for DOM, audio, tasks, state mutation, feedback, and persistence. For a new rule:

1. express the deterministic state transition as a pure function;
2. unit test boundary cases;
3. let the runtime module call it and render/schedule side effects;
4. add browser coverage only for integration behavior that pure tests cannot prove.

## State and compatibility

`state.js` initializes a single `g.state`. Reset, restore, and game-over paths in `ui.js` and `save.js` must remain consistent with it.

Persistence principles:

- version the save shape;
- validate all restored fields and bound numeric values;
- verify saved content against allowed static data;
- represent timers as remaining durations, then rebuild absolute time on restore;
- serialize enemies and queues as plain data, never DOM nodes or animation controls;
- clear invalid checkpoints deliberately while preserving unrelated settings when possible;
- migrate renamed difficulty keys explicitly;
- treat localStorage as untrusted and potentially unavailable.

Protected public names live in `STORAGE_KEYS` and `window.__runeRampartTest`. Changing them needs a migration and a risk gate.

## Time, pause, and cancellation

The game has multiple time-sensitive layers but one lifecycle:

- `requestAnimationFrame()` advances combat;
- `createGameTaskScheduler()` owns pausable delayed callbacks and promise waits;
- `animation.js` owns Motion controls in a registry;
- CSS animations pause through the `.is-paused` shell state;
- `sessionId` invalidates old asynchronous work after reset, restore, or game over.

Preserve these invariants:

- pause freezes combat, delayed tasks, Motion, CSS motion, and active-play scoring;
- resume shifts absolute combat deadlines by paused duration;
- reset/restore/game-over cancel old tasks and animations;
- asynchronous completion checks the session before mutating the new game;
- cancellation resolves or cleans up waiting code so the game does not remain locked;
- reduced motion may shorten visuals but must not accidentally advance gameplay early when duration carries semantic meaning.

Never introduce an independent ticker or timer library without routing it through this lifecycle.

## Motion, CSS, and XState boundaries

Use Motion when animation completion or cancellation controls a gameplay commit. The registry provides pause, resume, cancellation, cleanup, reduced-motion handling, and diagnostics.

Use CSS for:

- decorative loops;
- simple state styling;
- low-risk entry/impact flourishes;
- the explicit fallback selected by `animationDriver=css` and test environment configuration.

Use XState only when a bounded workflow has multiple legal phases and recovery paths. Do not move all of `g.state` into a state machine merely for consistency. The legacy board actor projects to the existing public `resolution` shape so persistence and tests retain one contract.

## DOM and accessibility

Interactive game surfaces are DOM controls with focus, keyboard, ARIA, and automation semantics. Canvas may be appropriate for isolated, non-interactive effects after measured evidence, but a Canvas rewrite would require replacing accessibility, input, scaling, persistence, and test affordances.

Preserve:

- semantic buttons and labeled regions;
- visible `:focus-visible` states;
- `aria-live` for changing status that users need;
- keyboard parity with pointer input;
- inert or disabled states during pause/lock;
- modal focus entry and return;
- `prefers-reduced-motion` behavior;
- mobile landscape guidance and actual scale-aware coordinates.

## Responsive layout

`layout.js` measures natural shell size and applies a single `--game-scale`. It also locks narrow portrait play and uses a fixed compact-landscape canvas width before scaling.

The CSS defines density tokens across viewport tiers rather than changing individual header fields ad hoc. Any pointer math must convert browser coordinates back into layout coordinates through the current scale.

When changing layout, test desktop, compact landscape, portrait guard, full screen, and reduced motion. Inspect text truncation, target sizes, focus outlines, overlays, and battle coordinates.

## Release pipeline

Vite emits hashed JS/CSS under `/_app/`. A build plugin injects a build ID and emits `asset-manifest.json`. The release scripts and `_headers` cooperate so:

- HTML and the manifest revalidate;
- hashed assets receive immutable long caching;
- live hashed assets can be preserved during upload;
- a client bootstrap retries once on entry-resource version skew, then offers a manual recovery panel;
- `verify-dist` checks the manifest, build ID, asset existence, recovery bootstrap, and cache headers.

Do not change only one part of this contract. Update Vite configuration, headers, preservation, verification, recovery, and deployment smoke coverage together.

Cloudflare Pages uses `NODE_VERSION=22`. Do not add `.nvmrc` to this repository; local development can use nvm without committing the file.

## Change discipline

Prefer:

- narrow patches in the owning module;
- pure rules plus focused unit tests;
- feature flags or explicit fallback for risky runtime changes;
- one migration dimension at a time;
- measured evidence for performance or dependency claims;
- current docs that match current behavior.

Avoid:

- growing `runtime.js` into a feature implementation;
- direct runtime side-effect imports across domains;
- making DOM/UI code the only source of a game rule;
- multiple clocks, duplicate state authorities, or animation duration duplicated in logic;
- blanket framework/Canvas rewrites;
- unsanitized save restoration;
- renaming storage/test contracts as cleanup;
- relying on the build succeeding as proof that gameplay, pause, or save behavior works.
