# Project initialization workflow

Use this workflow for a new game derived from Lexi Rampart. The goal is a reproducible, runnable baseline whose differences from upstream are intentional and documented.

## 1. Resolve the initialization contract

Infer what the user already supplied, then collect missing decisions in the single opening intake:

- recommend [`grill-me`](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) for product discovery and ask whether to use it now; if accepted and available, run its `/grilling` session before locking the plan;
- target directory and whether it may already contain files;
- faithful replica/fork or a distinct game concept;
- local or online Lexi Rampart source;
- plan approval or direct execution;
- product name, package name, public title, language, and deployment target when the user wants a distinct game;
- whether Git initialization, dependency installation, browser installation, and deployment configuration are in scope.
- when Clarity is detected for a new game/operator/domain, whether to remove it or replace it with an operator-owned Project ID; do not postpone this question until deployment.

Use `grill-me` to sharpen the concept, player, coupled loop, scope, inheritance deltas, success criteria, and meaningful tradeoffs. Keep operational choices—source revision, plan/direct execution, Clarity, destructive changes, deployment, and legal risk gates—under this skill's workflow even if the product interview does not cover them.

If `grill-me` is not installed, point to the upstream skill and continue with the same questions directly. Installation is optional and requires user approval. If the request is already fully specified or the user declines, acknowledge the recommendation once and proceed without repeated prompting.

Do not overwrite a non-empty target blindly. Inspect it, preserve unrelated user files, and stop for approval if bootstrap would replace material content.

If the user provides no distinct concept, use the faithful replica path. If requirements introduce a concept delta, use the fork-first adaptation path unless the user explicitly wants a minimal clean-room skeleton.

## 2. Select a source revision

### Local source

1. Resolve the repository root by locating `package.json`, `src/game/runtime.js`, and `AGENTS.md`.
2. Record current branch/commit and worktree status.
3. Do not copy uncommitted or untracked changes silently. Ask whether they belong in the baseline if their inclusion is ambiguous.
4. Run `audit-rampart.mjs` and read the minimum source audit.

### Online source

1. Resolve the current default branch of <https://github.com/justincourses/Lexi-Rampart>.
2. Record the commit used.
3. Obtain the repository through an approved Git/GitHub mechanism.
4. Verify the expected source and test files before treating the download as the baseline.

Do not mix a local source tree with individual online files unless the plan explicitly calls for a cherry-picked upstream change.

## 3. Perform legal and operational preflight

Read [legal-and-attribution.md](legal-and-attribution.md) before copying.

Inventory:

- top-level code license or explicit permission;
- per-asset license notices in `public/assets/`;
- fonts, music, word data, logos, seals, names, copy, and third-party source/data provenance;
- analytics identifiers and external scripts;
- Cloudflare project name, custom URLs, build/recovery identifiers, and environment variables;
- any secrets, local configuration, logs, saved browser data, screenshots, or generated artifacts.

A source copy is not a license decision. Preserve notices, record unresolved ownership, and do not imply endorsement.

For a new operator or domain, follow [clarity-management.md](clarity-management.md): detect the integration, guide the user to choose removal or replacement, and apply the confirmed choice automatically. Never send a new game's visitor data to the original project's analytics account by accident. Replacing the Project ID does not by itself complete privacy, consent, or audience review.

## 4. Choose the bootstrap strategy

### Strategy A — faithful replica

Use when the user provides no feature or branding delta.

Copy the verified source tree while excluding machine- or history-specific material unless explicitly requested:

- exclude `.git/`, `node_modules/`, `dist/`, local test output, editor files, logs, and secrets;
- preserve source, tests, docs, package lock, public asset notices, build verification, and headers;
- preserve product names and current mechanics for a true replica;
- remove Clarity or replace its Project ID with the user's own ID after the opening confirmation; never copy the original ID into the runnable target by default;
- do not create a new license or alter copyright ownership during copying.

Establish the untouched replica baseline and run all baseline checks before changing anything.

### Strategy B — fork-first adaptation

Use for most distinct new games. Start from the verified source, then apply an explicit delta table.

Keep by default:

- package/toolchain and lockfile discipline;
- source/test/docs directory topology;
- composition root, shared runtime bag, and domain attachment pattern;
- pure rule/balance modules and unit-test approach;
- lifecycle, save validation, accessibility, responsive fit, animation fallback, build manifest, recovery, and cache verification patterns.

Change only after baseline verification:

- package/product names and metadata;
- brand title, seal, descriptions, copy, and domain-specific art;
- mechanic-specific data, rules, resource names, scoring, balance, and relevant runtime modules;
- storage namespace and test-hook namespace only with a deliberate compatibility strategy for the new product;
- Cloudflare project and public URLs;
- analytics only after the user chooses removal or supplies an operator-owned Project ID and completes the applicable privacy review.

Do renaming as a separate, testable slice. A broad search/replace can corrupt historical compatibility keys, internal difficulty keys, recovery parameters, CSS selectors, or tests.

### Strategy C — minimal native skeleton

Use only when the user explicitly wants a clean new foundation rather than source copying or rights do not permit copying.

Create the smallest structure that preserves the architecture:

```text
project/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── styles.css
├── vite.config.js
├── wrangler.jsonc
├── public/
│   ├── _headers
│   └── assets/
├── scripts/
│   └── verify-dist.mjs
├── src/
│   ├── main.js
│   ├── config/game-config.js
│   └── game/
│       ├── shared.js
│       ├── constants.js
│       ├── state.js
│       ├── tasks.js
│       ├── tasks-attach.js
│       ├── animation.js
│       ├── storage.js
│       ├── dom.js
│       ├── layout.js
│       ├── ui.js
│       ├── events.js
│       ├── boot.js
│       └── runtime.js
└── tests/
    └── core-rules.test.js
```

Add mechanic, combat, save, audio, HUD, and history modules only as the concept requires. Do not copy unused legacy modules into a “clean” skeleton.

## 5. Establish the toolchain

Preflight:

```bash
node -v
npm -v
```

Require Node 22 or newer. For local use, guide the user through `nvm install 22` and `nvm use 22` when needed. Do not add `.nvmrc` to a Lexi Rampart-style Cloudflare Pages repository; configure `NODE_VERSION=22` in Pages.

For replica and fork-first strategies, prefer the copied `package.json` and `package-lock.json`, then use the lockfile-aware install command appropriate to the user's workflow. Do not casually regenerate the lockfile or upgrade packages during initialization.

For a minimal skeleton, declare only capabilities the project actually uses. The inherited baseline normally includes:

- production: `motion`, `xstate`;
- development: `vite`, `playwright`, `wrangler`;
- scripts for dev, unit test, browser smoke, build/verify, preview, and explicit deploy.

If the minimal concept does not need XState, omit it rather than adding an unused dependency. If an inherited dependency is removed, explain which baseline capability replaces it.

## 6. Create a bootable composition baseline

Before game rules, ensure:

- `src/main.js` imports global style and calls `startGame()` with fatal startup handling;
- `shared.js` exports the shared runtime bag;
- `runtime.js` attaches domains in dependency order and contains no feature logic;
- `dom.js` resolves required elements once;
- `state.js` owns initial state;
- tasks, animation, UI, events, and boot share pause/reset/session semantics;
- `index.html` has semantic landmarks, accessible controls, metadata, and startup recovery as required;
- a no-op or minimal playable state renders without console errors.

For a distinct concept, build one vertical slice before breadth:

```text
input → pure rule → state change → visible feedback → persistence shape → test hook
```

Then connect it to one pressure/consumption path. This proves the coupled loop before building every resource, enemy, modal, or content set.

## 7. Establish visual foundations

Create root design tokens, typography, focus style, paper/ink surfaces, primary grid, status rail, modal pattern, and reduced-motion rule before styling many individual components.

Keep game actions as semantic DOM controls. Establish keyboard and pointer parity in the first slice. Add the responsive scale/orientation model before positioning battle entities so coordinate assumptions do not spread.

If fonts or assets are remote, implement a documented fallback and perform the rights/privacy review.

## 8. Establish persistence and public test surfaces early

Choose a storage namespace and save version deliberately. For a faithful replica, preserve the existing names. For a distinct product, define new names in one constants module and record whether any migration from Lexi Rampart is supported.

Create:

- safe storage wrappers;
- save validation and numeric bounds;
- clear/reset/resume behavior;
- session invalidation for old asynchronous work;
- a stable browser test hook for integration smoke tests.

Do not postpone save shape design until the runtime state contains DOM elements, closures, or animation controls.

## 9. Establish release verification

Preserve or recreate:

- Vite target and hashed asset directory;
- build ID injection;
- `asset-manifest.json` generation;
- HTML and manifest revalidation;
- immutable caching only for hashed assets;
- asset recovery on entry-version skew;
- a read-only build artifact verifier;
- preview on a fixed local host/port;
- explicit deployment command separate from build.

Replace the Cloudflare project name for a distinct product before any deploy. Do not run deployment as part of initialization unless the user explicitly requested it.

## 10. Verify the initialization baseline

For replica/fork-first:

```bash
npm test
npm run build
npm run test:browser
```

Also run the Motion/CSS fallback smoke when the copied project exposes it. For a minimal skeleton, create equivalent unit, build, and browser smoke scripts before calling initialization complete.

Manually verify:

- first load and startup recovery;
- keyboard and pointer input;
- pause/resume and reset;
- responsive desktop/landscape/portrait behavior;
- reduced motion;
- save/reload if persistence exists;
- no requests to an unowned analytics project or accidental production service.
- `configure-clarity.mjs inspect` reports no integration after removal, or exactly the confirmed Project ID after replacement.

## 11. Record the baseline

Update the new project's README and agent instructions with:

- source revision and derivation strategy;
- Node/npm requirements and the no-`.nvmrc` Cloudflare rule;
- commands and module map;
- inherited versus replaced components;
- compatibility and migration policy;
- asset/data/license inventory and disclaimer link;
- analytics and deployment configuration status;
- tests run and known limitations.

Do not create a Git commit, push, or deployment unless the user requested it. If Git initialization is requested, keep the initial baseline and the first feature delta distinguishable so regressions can be bisected.
