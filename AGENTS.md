# AGENTS.md

## Project

`arrowbound` is a desktop-browser 2D archery incremental Roguelite game.

The first release uses Phaser, TypeScript, and Vite with a fixed 1280 × 720 logical canvas. The repository is currently documentation-first; do not invent behavior that conflicts with the design documents.

## Source of truth

Read the relevant documents before implementing a system:

1. `docs/01_游戏简介.md` — product direction and MVP boundaries
2. `docs/02_游戏玩法.md` — gameplay rules
3. `docs/03_游戏整体架构.md` — architecture and data structures
4. `docs/04_TODOLIST.md` — implementation order and acceptance criteria
5. `docs/05_首版数值配置.md` — exact first-release values and formulas
6. `docs/06_状态机与边界规则.md` — state transitions and edge cases
7. `docs/07_视觉素材与动效规范.md` — mandatory SVG asset, no-emoji, animation, and visual-feedback rules

When documents overlap, exact numeric configuration in document 05, state or edge behavior in document 06, and visual or animation behavior in document 07 take precedence. If a real contradiction remains, stop and ask before choosing product behavior.

## First-release scope

The MVP must include:

- Ten configured levels
- Player bow swing, cooldown, and click-to-shoot input
- Real ballistic arrows and continuous target-plane collision detection
- Ring scoring, coin drops, and pointer collection
- Permanent shop upgrades and unlock conditions
- Per-level blessing selection
- Timed challenges and atomic chest rewards
- Robot probability-based aiming with real physical arrows
- Coin pet auto-collection
- Modal and page-visibility pause behavior
- Versioned localStorage saves and recovery

Accounts, cloud saves, leaderboards, mobile support, offline income, 3D chests, and a Godot version are outside the MVP.

## Engineering rules

- Use TypeScript with strict type checking.
- Keep gameplay logic out of Phaser scene classes where practical. Scenes coordinate rendering and input; systems own rules.
- Keep levels, shop items, blessings, robots, pets, and challenges configuration-driven.
- Do not hard-code documented balance values inside system logic.
- Use one state controller for phase changes. UI sends intent and must not write save data directly.
- Use one game clock for gameplay timers. Do not scatter browser `setTimeout` calls through game systems.
- Use the shared projectile implementation for player and robot arrows.
- Detect a hit by interpolating the arrow tip across the vertical target plane. Do not use ordinary overlap with the circular target sprite.
- Route shot income through coin drops and the shared collection path. Route chest income through the reward system.
- Queue and persist rewards before opening reward UI. A refresh must not reroll or duplicate a reward.
- Use object pools for arrows and coin drops. Clear listeners, locks, and challenge metadata when recycling objects.
- Use an injectable random service so tests can use deterministic seeds.
- Use a repository interface around persistence; localStorage is only the first implementation.
- Draw every placeholder and production visual asset as an SVG file and store it under `public/assets/svg/` in the documented category directory.
- Do not use inline SVG strings, raster images, or Phaser Graphics as substitutes for final visual assets.
- Do not use emoji anywhere in repository content or game UI. Use text or project SVG icons instead.
- Implement interaction animation only after its trigger, timing, easing, attention level, interruption behavior, and acceptance criteria are defined in document 07.
- Keep frequent feedback short and unobtrusive. Major rewards may pause the game, but must not create unnecessary repeated waiting.

## Important gameplay invariants

- Final coin values are integers rounded down; a successful hit is worth at least one coin.
- A level clears only when the player pays its target amount and unlocks the next level.
- An already-cleared level never charges that unlock cost again.
- Challenge score increases only when a coin generated for the active challenge is collected before time expires.
- Coins that existed before a challenge can enter the wallet but cannot increase challenge score.
- Uncollected coins are credited to the wallet during a normal level transition and never count toward a challenge.
- Opening shop, settings, blessing, or reward UI pauses gameplay and challenge time.
- Manual ten-ring income should remain roughly three to five times the robot's average per-arrow income.
- The lucky-first-ten blessing is triggered only by a manual shot and only once per level.

## Workflow

Follow `docs/04_TODOLIST.md` in order unless a task explicitly requires otherwise. Always inspect it before choosing work. While it contains unfinished tasks, do not propose or implement unrelated features or optimizations. Once every TODO is complete, project additions and optimizations may be proposed.

For each implementation unit:

1. Identify the governing gameplay and state rules.
2. Add or update configuration and types first.
3. Implement the smallest complete system behavior.
4. Add focused tests for formulas, boundaries, state transitions, and persistence.
5. Run type checking, tests, and the production build.
6. Immediately update the corresponding TODOLIST checkbox after its acceptance conditions pass.
7. Run the repository emoji scan and verify that new visual assets are SVG files in the required asset directory.

Do not mark a checkbox complete based only on the presence of code.

## Testing priorities

At minimum, cover:

- Ballistic solver reachability and no-solution cases
- Continuous target-plane crossing and exact ring boundaries
- Coin rounding and multiplier order
- Shop price, unlock, maximum-level, and cooldown-limit formulas
- Challenge ID eligibility and collection timing
- Level-clear payment atomicity
- Reward queue persistence and refresh recovery
- Save migration, missing fields, and corrupt data
- Pause and resume without duplicate timers or objects
- Seeded blessing, robot-target, and reward selection

## Repository hygiene

- Preserve unrelated user changes.
- Never commit generated output, dependencies, secrets, `.env` files, or `.DS_Store`.
- Keep commits focused and use clear imperative messages.
- Update README or design documents when user-visible behavior or project setup changes.
