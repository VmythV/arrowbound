# AGENTS.md

## Project

`arrowbound` is a desktop-browser 2D archery incremental Roguelite game.

The first release uses Phaser 4.x, TypeScript, and Vite with a fixed 1280 × 720 logical canvas. The repository is currently documentation-first; do not invent behavior that conflicts with the design documents.

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

## Project Phaser skills

The official Phaser skills are checked into `.agents/skills/` and are part of this repository. This is the single source of truth. For Claude Code discovery, `.claude/skills/` contains one symlink per skill pointing back to `.agents/skills/<name>`; both tools load the same files. Do not delete those symlinks, and add a matching one when importing a new upstream skill.

- Before implementing a Phaser system, load the smallest relevant official skill or skills from `.agents/skills/`.
- Use `v4-new-features` for Phaser 4-specific APIs and behavior.
- Use `v3-to-v4-migration` only when evaluating or adapting a Phaser 3 pattern.
- Prefer Phaser 4.x APIs. Do not introduce a Phaser 3-only approach when an official Phaser 4 replacement exists.
- Keep the installed skill files unchanged unless the user explicitly requests an upstream skill update.

## Engineering rules

- Use TypeScript with strict type checking.
- Use Phaser 4.x and pin the installed major version to 4.
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

### Reusable verification commands

- Run `npm run check` after every implementation unit. It executes strict type checking, unit tests, the repository emoji scan, and the production build.
- Run `git diff --check` before handoff or commit.
- Verify visual asset extensions with `find public/assets/svg -type f ! -name '*.svg' ! -name '.gitkeep' -print`; any output must be investigated.
- Run `npm run check:browser` after changes to Phaser scenes, rendering, asset loading, scaling, input, animation, or other browser-visible behavior. Logic-only changes do not require it unless their acceptance criteria depend on browser behavior.

`npm run check:browser` starts an isolated Vite server on `127.0.0.1:4173`, checks the 1280 × 720 logical canvas at 1600 × 900 and 1024 × 768 viewports, verifies required Boot/Preload SVG requests, fails on browser console or page errors, and writes `summary.json` to `/tmp/arrowbound-browser-check/`. For visual acceptance, run `npm run check:browser -- --interaction-screenshots`; this additionally captures layout plus shooting rest, release, cooldown, and reset screenshots.

Browser-check prerequisites are Python 3, the Python `playwright` package, and a local Chrome or Chromium executable. Override browser discovery with `ARROWBOUND_CHROME_PATH` and the output directory with `ARROWBOUND_BROWSER_OUTPUT`. To test an already-running server, use `python3 scripts/check-browser.py --url http://127.0.0.1:5173/`.

Review the generated interaction screenshots whenever visual acceptance matters; the automated checks cannot infer whether an animation looks correct. Screenshot capture is opt-in because headless WebGL capture is slower than the default assertions. In sandboxed agent environments, request browser-launch approval instead of skipping browser verification. Do not mark a visual TODO complete when browser verification could not be run. Avoid `--disable-gpu`: it has caused headless Phaser startup hangs. The script uses separate pages for timing snapshots because repeated captures from one long-running headless WebGL page can contain compositor artifacts.

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
