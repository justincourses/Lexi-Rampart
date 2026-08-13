# Game design and balance patterns

Use these patterns to understand the current game and translate its strengths into a new concept. Verify exact formulas in current source.

## The defining product loop

Lexi Rampart combines two concurrent loops:

```text
Complete a bounded cognitive/input challenge
→ earn a previewed typed resource and score
→ feed automatic combat, defense, repair, or upgrades
→ survive increasing real-time pressure
→ repeat without pausing the battlefield
```

This bridge is the core design asset. The spelling task is not a disconnected quiz, and the tower defense is not a passive backdrop. Every correct action produces resources with an immediately legible combat role.

For a new game, preserve the bridge even when changing the surface mechanic. Define:

- the active task;
- its success, partial failure, and recovery states;
- each produced resource;
- the system that consumes it;
- the feedback that shows the causal connection;
- the pressure that prevents unlimited deliberation.

## Current spelling loop

- Select a word from a shuffled bag for the chosen difficulty.
- Hide 1–3 positions while leaving at least two letters visible.
- Fill missing letters from left to right through QWERTY buttons or physical keyboard.
- Lock correct letters; wrong inputs do not erase progress.
- On the third wrong input, reveal the answer for about one second and move on without reward.
- On success, attempt English system speech, award resources and score, then move to the next word.
- Keep combat running throughout the task.

The design avoids soft locks and punitive spirals. Failure teaches the answer and consumes opportunity rather than damaging the wall again.

## Difficulty couples knowledge and pressure

User-facing mapping:

| Internal key | User label | Word bands | Missing-letter tendency | Combat pressure |
| --- | --- | --- | --- | --- |
| `veteran` | 萌新 | A1–A2 | usually 1 | lower |
| `endless` | 老兵 | B1–B2 | usually 1–2 | medium |
| `master` | 大佬 | C1–C2 | usually 2–3 | higher |

The internal names are historical and counterintuitive; do not “clean them up” without migration.

Difficulty changes both sides of the loop. A good adaptation should not only inflate enemy health or only make the puzzle harder. Tune player throughput, error rate, reward value, spawn pressure, and durability together.

CEFR labels in this game are reference bands, not official certification, exhaustive vocabulary, a course, or an assessment. Preserve that wording when applicable.

## Controlled randomness and fairness

Two shuffle bags matter:

- a word bag prevents short-term repetition before a cycle is exhausted;
- a rune/resource bag cycles through all resource types and prevents survival-critical starvation.

Generalize this as constrained variance. Randomness should create texture, not invalidate player planning. Use:

- bags or decks for coverage;
- caps for rare special enemies;
- visible reward previews;
- bounded random ranges;
- fallback outcomes when a service such as speech is unavailable;
- at least one recovery route after failure.

Avoid independent pure randomness for resources that the survival loop requires.

## Resource grammar

Current resources communicate through stable colors and symbols:

| Type | Symbol | Function |
| --- | --- | --- |
| Ember / 红曜石 | `◆` | charges stronger automatic shots |
| Mana / 蓝晶 | `✦` | accumulates toward an active full-field volley |
| Moss / 绿晶 | `⬟` | repairs wall first, then converts overflow to shield |
| Coin / 铸币 | `●` | adds reinforcement toward equipment upgrades |

The types have distinct temporal roles: immediate offense, banked active power, recovery/overflow protection, and long-term progression. Preserve that portfolio in a new theme even if the names change.

Rewards separate type from magnitude:

- type comes from the controlled bag;
- magnitude comes from challenge (level, word length, hidden count);
- errors reduce score and can reduce the final rune amount;
- zero-error completion adds a first-try bonus;
- previewed base reward appears before input.

This makes randomness fair while keeping mastery valuable.

## Combat and progression

- The turret targets the entered enemy closest to the wall.
- Enemies outside the entry boundary cannot be targeted immediately.
- Enemies have balanced, fast, assault, armored, and boss roles with distinct silhouettes and stats.
- Every difficulty is endless until wall failure.
- Waves 1–10 form an adaptation/development runway.
- After wave 10, every wave grows and each ten-wave boundary adds a stronger stage jump.
- Battlefield density is bounded at extreme waves for browser performance while durability and pressure continue to scale.
- Boss waves occur every ten waves.
- A cleared wave has a fixed three-second intermission.

Equipment forms three parallel progression axes:

- weapon: damage and Ember capacity;
- armor: damage reduction, wall maximum, shield maximum, and repair on upgrade;
- charm: attack speed, volley behavior, and Mana capacity.

Auto-upgrade selects among the current lowest levels with rotation; manual priority can pin a slot. Existing reinforcement is not lost when the strategy changes.

## Special-enemy rewards

Some enemies carry blast, frost, or shatter effects. Defeating them queues a limited-shot buff. Multiple effects respect acquisition order. Easier modes allow more carriers; the hardest mode has none in the current design.

The lesson is not “hard mode removes fun.” The easier modes receive more comeback texture and spectacle, while the hard mode emphasizes base-system execution. Explain this tradeoff if changing the distribution.

## Feedback hierarchy

Every important action is reflected at multiple appropriate layers:

- input state: locked letter, wrong button, revealed answer;
- local reward: reward label and burst;
- resource HUD: amount and `+N`/`-N` pulse;
- world feedback: projectile, wall repair, shield, upgrade, enemy effect;
- battle log: terse causal explanation;
- persistent outcome: score, wave, word count, local history.

Do not replace causal feedback with particles alone. Players need to see what changed and why.

## Pause, save, and scoring are design systems

Pause must stop danger and time-based effects, not merely cover the screen. Active-play duration excludes paused time. Saves preserve the current spelling round, bags, wave, enemy state, resources, equipment, buffs, and remaining delays.

The local leaderboard prioritizes survival progression within difficulty before score and secondary statistics. This keeps the primary objective legible.

For a new game, decide:

- which moments checkpoint;
- whether a restored action can be resumed safely;
- how time is measured;
- what determines rank;
- which state cannot be migrated and how it will be handled.

## Balance workflow

Do not tune by isolated constants or personal feel alone.

1. Write a simple throughput model for player success per minute and resource production.
2. Model enemy durability, damage, density, travel time, and equipment progression.
3. Simulate representative efficiency levels and locate first-failure/minimum-margin regions.
4. Validate monotonic and cap invariants in unit tests.
5. Playtest opening runway, first stage jump, boss waves, and late-wave density.
6. Inspect all difficulties for cognitive pressure and combat pressure together.
7. Record intended outcomes so later changes do not optimize against accidental values.

Balance simulation is a guardrail, not proof of fun. Pair formulas with live play and user-visible metrics.

## Scope discipline

The current game deliberately omits definitions, example sentences, accounts, cloud saves, spaced repetition, pronunciation scoring, and online dictionary calls. This keeps the prototype centered on whether spelling can fuel live defense.

For any new feature, ask whether it strengthens the core bridge, creates a needed recovery/clarity tool, or merely expands scope. Do not make an adjacent platform feature a prerequisite for validating the game loop.
