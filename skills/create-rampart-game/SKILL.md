---
name: create-rampart-game
description: Build a new browser game from Lexi Rampart or safely extend the existing Lexi Rampart game. Use this skill whenever a user asks to recreate, fork, reskin, adapt, expand, rebalance, modernize, or add features to Lexi Rampart, or wants a new game that should borrow its gameplay loop, native Vite architecture, Motion/XState integration, Cloudflare Pages pipeline, campaign-dossier visual language, accessibility, save system, or testing discipline. Default to source-backed fidelity and stability; do not replace the established stack merely for novelty.
compatibility: Requires filesystem and shell access for local-source work. Internet or GitHub access is needed only when the user selects online source or no local checkout exists. Lexi Rampart itself requires Node.js 22 or newer and npm.
---

# Create Rampart Game

Use Lexi Rampart as an evidence-backed product and engineering reference for two tracks:

1. create a new game from its foundation;
2. make a safe second-generation change inside Lexi Rampart.

Treat source code as the authority. The bundled references explain where to look and why the project is shaped this way, but they are not a substitute for inspecting the current checkout or the current upstream repository.

Canonical upstream: <https://github.com/justincourses/Lexi-Rampart>

## Start with one compact intake

Infer answers already present in the request. Ask only for missing choices, and combine them into one opening question so an unattended run does not stop midway:

- Is this a new game or a change to Lexi Rampart? If the request makes this obvious, do not ask.
- Should source truth come from the local checkout or the online upstream? Default to local source, then use upstream only when local source is absent or the user chooses it.
- Should the agent present a plan for approval or continue directly after planning? Default to plan and approval. If the user says to execute directly, create the same internal plan and continue without a routine approval pause.
- When the selected source or target contains Microsoft Clarity and the work creates a new game, changes operator/domain, or prepares publication, should Clarity be removed or replaced with the user's own Project ID? Recommend removal for a new, educational, or potentially under-18 audience. Treat an explicitly supplied choice and Project ID as confirmation; otherwise obtain the choice before copying or editing the integration.

If the user gives no new-game concept or feature delta, reproduce Lexi Rampart faithfully. Do not invent a different stack, art direction, or ruleset merely to make the result look novel.

The direct-execution choice removes routine approval pauses. It does not waive the risk gates in this skill.

## Establish source truth

Read [references/source-map.md](references/source-map.md) first.

When a local checkout is available:

1. Read repository-level instructions such as `AGENTS.md` and follow them over this skill where they are more specific.
2. Run `node skills/create-rampart-game/scripts/audit-rampart.mjs <repo-root>` when the script is reachable from the current checkout.
3. Read `package.json`, `README.md`, `CONTRIBUTING.md`, `docs/gameplay.md`, `src/game/runtime.js`, and the files routed by the source map for the requested feature.
4. Inspect tests beside the affected domain before proposing changes.
5. Cite file paths and concrete symbols in the plan. Separate observed facts from inferences.

When using online source:

1. Read the upstream repository's current default branch, not remembered snippets.
2. Record the branch or commit and access date in the plan.
3. Read the same minimum files and task-specific modules as for a local checkout.
4. Do not combine local and online files silently. If they differ, identify which source governs the work.

## Load only the needed references

- Read [references/architecture.md](references/architecture.md) for runtime composition, state, animation, persistence, dependencies, deployment, or module placement.
- Read [references/game-design.md](references/game-design.md) for mechanics, reward economies, difficulty, combat pacing, scoring, or a new-game concept.
- Read [references/visual-style.md](references/visual-style.md) for UI, visual identity, interaction feedback, responsive behavior, sound, or accessibility.
- Read [references/project-initialization.md](references/project-initialization.md) before creating a new game workspace, copying the baseline, renaming the product, or configuring local/build/deploy foundations.
- Read [references/clarity-management.md](references/clarity-management.md) whenever the audit detects Microsoft Clarity, a new game/operator/domain is involved, or the user asks to remove, replace, retain, or configure analytics.
- Read [references/legal-and-attribution.md](references/legal-and-attribution.md) before copying code or assets into another project, publishing, commercializing, adding analytics, or changing attribution.

## Build the plan from evidence

Use this structure for a user-facing plan:

1. **Mode and source snapshot** — new game or second development; local or online source; source revision.
2. **Goal and non-goals** — restate the requested outcome and what will remain unchanged.
3. **Source evidence** — list the relevant files, symbols, mechanics, visual tokens, and tests examined.
4. **Keep/change decisions** — compare the Lexi Rampart baseline with the requested delta, including reasons.
5. **Gameplay and balance** — describe the player loop, resource producers/consumers, difficulty, failure/recovery, and measurable tuning assumptions.
6. **Implementation map** — name files to add or modify, module boundaries, data flow, and dependency order.
7. **Compatibility** — cover saves, storage keys, test hooks, animation fallback, accessibility, and deployment contracts.
8. **Visual and interaction system** — specify palette, typography, layout, feedback states, responsive behavior, and reduced motion.
9. **Verification and rollback** — list unit, browser, build, manual checks, documentation changes, and rollback points.
10. **Rights and operational review** — identify reused material, licenses/permissions to verify, analytics/privacy considerations, and unresolved risks.

In approval mode, end with one concrete approval question. In direct mode, continue into implementation unless a hard risk gate applies.

## Track A: create a new game

Start from faithful inheritance, then apply only requested deltas.

Before feature implementation, follow [references/project-initialization.md](references/project-initialization.md). Establish and verify a clean, runnable baseline before applying concept changes; otherwise later failures cannot be distinguished from bootstrap mistakes.

If the baseline contains Microsoft Clarity, follow [references/clarity-management.md](references/clarity-management.md) during initialization. Do not leave the original Project ID in a new game or new operator's copy. After the user's opening choice, automatically remove the integration or replace the ID with the user's validated ID, then verify the result.

### Default inheritance

Unless the user explicitly asks otherwise, preserve:

- Node.js 22+, npm, Vite, native ES modules, and a client-only browser runtime;
- `src/main.js` leading to a small composition root similar to `startGame()`;
- domain modules attached in dependency order through `attachX()` and a shared runtime bag for cross-domain runtime calls;
- pure modules for rules, generation, balance, and validation so Node unit tests can exercise them without a browser;
- Motion for logic-coupled cancellable animation, CSS for decorative animation and fallback, and XState only for bounded local workflows that benefit from an explicit machine;
- DOM controls and semantic HTML for interactive game surfaces rather than a blanket Canvas rewrite;
- local persistence with validated, versioned saves and explicit migrations;
- the paper, ink, seal, campaign-dossier, battlefield-report visual language;
- responsive desktop and landscape play, keyboard support, focus visibility, reduced motion, pause/resume, and accessibility semantics;
- Vite hashed assets, manifest verification, cache rules, asset-recovery behavior, and Cloudflare Pages deployment conventions;
- unit tests, Playwright smoke coverage, build verification, and documentation.

### Translate the concept without breaking the architecture

Map the new concept onto Lexi Rampart's two coupled loops:

- an active player task produces typed resources;
- a real-time or continuously progressing pressure system consumes those resources;
- previewed rewards make the bridge legible;
- controlled randomness prevents resource starvation;
- failure reveals or recovers instead of trapping the player;
- difficulty changes both cognitive/input pressure and combat/system pressure.

Use a delta table with `baseline`, `requested change`, `affected modules`, `risk`, and `verification`. If a requirement does not conflict with the baseline, keep the baseline.

Create a new brand only when the user provides a distinct concept or asks for one. Reuse exact names, seals, text, code, word data, music, or audio only after completing the rights review.

## Track B: second development of Lexi Rampart

Prefer the smallest coherent change in the owning domain module.

1. Trace the current flow from event to pure rule to state mutation to feedback to save/test surface.
2. Identify invariants before editing.
3. Put pure calculations in the appropriate pure module; keep DOM and runtime side effects in an `attachX()` domain module.
4. Call cross-module runtime behavior through `g.xxx`; do not grow `runtime.js` into a feature module.
5. Preserve pause, resume, cancellation, session invalidation, reduced motion, and CSS fallback wherever timing is involved.
6. Validate and migrate persisted input. Never trust localStorage shapes merely because the producer is local.
7. Update user-facing and collaborator documentation when rules, commands, architecture, or deployment behavior changes.
8. Add the narrowest unit test first, then browser coverage for integration-sensitive behavior.

Legacy match-three files remain useful migration history and test material, but they are not the current primary input loop. Confirm current entry paths before reviving or deleting them.

## Hard risk gates

Pause, explain the risk, propose migration and rollback, and obtain explicit confirmation before intentionally changing any of these contracts:

- `window.__runeRampartTest` name or existing public fields;
- `runeRampart.*` localStorage keys, save versions, or persisted shapes without a migration;
- `attachX()` ownership boundaries or the client-only native main loop;
- Motion/CSS fallback behavior, `prefers-reduced-motion`, pause/resume, or session cancellation semantics;
- `/_app/` asset paths, build manifest/build ID, cache headers, asset recovery, or Cloudflare deployment behavior;
- the Node 22 requirement or the rule against a repository `.nvmrc`;
- a new framework, rendering engine, analytics service, runtime dependency, or comparable stack replacement;
- retaining, enabling, or replacing an analytics integration without confirming operator ownership, audience, and the requested remove/replace action;
- copying or publishing material whose license, ownership, trademark, privacy, or data rights are unclear;
- production deployment, destructive data changes, or irreversible operations.

When the user insists on a gated change, confirmation is necessary even in direct-execution mode. Explain concrete failure modes, not generic warnings.

## Dependency and modernization rule

Stability is the default. Do not introduce React, Vue, Phaser, PixiJS, another animation/state library, or a new game framework because it appears more modern.

Consider a new dependency only when a stated product requirement cannot be met reasonably by the current stack. Present:

- the missing capability and evidence;
- the smallest trial boundary;
- bundle, runtime, accessibility, persistence, and test impact;
- pause/cancellation and lifecycle integration;
- fallback and rollback;
- an acceptance metric proving the dependency is worth keeping.

If the user still requests the replacement, use the hard risk gate.

## Implement and verify

After approval, or immediately in direct mode:

1. Preserve unrelated user changes and follow repository editing instructions.
2. Implement in small, reviewable slices with a clear rollback point.
3. Update or add pure tests alongside rule changes.
4. Run the narrowest relevant checks during development.
5. Before declaring completion, run `npm test`, `npm run build`, and applicable Playwright smoke tests. If a command cannot run, report why and what remains unverified.
6. Manually inspect the actual game for user-visible layout, input, feedback, pause/resume, and responsive changes.
7. Do not run `npm run deploy` unless the user explicitly requests production deployment.
8. Summarize user-visible behavior, key files, compatibility decisions, tests, unresolved risks, and any next action.

Completion requires passing relevant unit tests, a successful production build, and the applicable browser smoke tests. A code diff alone is not completion.

## Legal and safety notice

This skill supplies technical workflow and project analysis, not legal advice and not a license grant. A public GitHub repository is not automatically permission to reuse all code or assets. Follow [references/legal-and-attribution.md](references/legal-and-attribution.md), preserve third-party notices, verify permissions for the intended distribution and jurisdiction, and recommend qualified legal review when rights or regulatory obligations are material or unclear.
