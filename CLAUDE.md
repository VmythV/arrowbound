# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 前置阅读

`AGENTS.md` 是本仓库的主规则文件，包含完整的工程约束、玩法不变量和工作流程。开始任何实现前先读它，本文件不重复其内容。

`docs/` 目录是行为的最终来源，实现某个系统前先读对应文档；文档冲突时优先级为：数值以 `docs/05_首版数值配置.md` 为准，状态与边界以 `docs/06_状态机与边界规则.md` 为准，视觉与动效以 `docs/07_视觉素材与动效规范.md` 为准。仍有真实矛盾时停下询问，不要自行决定产品行为。

按 `docs/04_TODOLIST.md` 顺序推进，动工前先看它；其中仍有未完成任务时，不要提议或实现无关功能。

## 常用命令

```bash
npm run dev          # 启动 Vite 开发服务器 (127.0.0.1:5173)
npm run build        # tsc -b 后执行 vite 生产构建
npm run typecheck    # 严格类型检查，不产出文件
npm run test         # vitest 单次运行
npm run test:watch   # vitest 监听模式
npm run check:emoji  # 全仓库 emoji 扫描（仓库和游戏内禁止 emoji）
npm run check        # 完整质量门禁：typecheck + test + emoji + build，依次执行
```

运行单个测试文件：`npx vitest run src/tests/ballistics.test.ts`
按名称过滤：`npx vitest run -t "ring boundary"`

提交或标记 TODO 完成前，`npm run check` 必须通过。要求 Node.js >= 22.12。

## 架构

固定 1280×720 逻辑画布的桌面网页游戏，`Phaser.Scale.FIT` 等比缩放。技术栈：Phaser 4.x + TypeScript（严格模式，开启 `exactOptionalPropertyTypes`、`noUncheckedIndexedAccess` 等）+ Vite。

**启动链**（`src/game/GameApp.ts` 中注册的场景顺序）：
`BootScene`（创建服务、加载 boot 阶段 SVG） → `PreloadScene`（加载其余资源） → `MainGameScene`（游戏渲染与输入） → `UIScene`（HUD 与弹窗，叠加运行）。

**服务与逻辑分层是核心约定**：玩法规则由 systems 拥有，场景只负责渲染和输入协调，不写存档。共享服务在 `BootScene` 中通过 `createGameServices()` 创建，存入 Phaser registry（键 `arrowbound:services`），其他场景用 `getGameServices(this.registry)` 取出。服务包含：

- `GameEventBus`（`src/game/events/`）— 系统间解耦通信，如 `state:changed`、`save:changed`、`reward:queued`。
- `StateController`（`src/game/state/StateController.ts`）— 唯一的相位状态机。相位转换受 `ALLOWED_PHASE_TRANSITIONS` 白名单约束，非法转换抛错；有 modal 打开时禁止转换相位。暂停用 `PauseReason` 集合管理（shop/blessing/chest/settings/visibility），任一原因存在即暂停。UI 只发意图，不直接改状态或存档。
- `GameClock`（`src/game/systems/GameClock.ts`）— 所有玩法计时器的唯一时钟，由场景 update 驱动 `update(deltaMs)`。不要在系统里散布 `setTimeout`。暂停时不推进。
- `RandomService`（`src/game/utils/random.ts`）— 可注入随机源，测试用确定性种子。祝福、机器人瞄准、奖励抽取都走它。

**状态分两类**：`RuntimeState`（内存态相位、冷却、挑战进度）与 `SaveData`（`src/game/state/SaveData.ts`，持久化，带 `version` 字段用于迁移）。持久化应走 repository 接口，localStorage 只是首个实现。

**奖励原子性**（`src/game/systems/RewardSystem.ts`）：奖励先 `queue()` 写入待领取队列并立即存档，再显示弹窗；`claimNext()` 领取时校验队首未变、发放后再出队并存档。刷新页面不得重复抽奖或重复发放。

**配置驱动**：关卡、商店、祝福、机器人、挑战全部在 `src/game/config/` 中以带类型的常量描述，不要把文档中的数值硬编码进系统逻辑。`asset-manifest.ts` 声明所有 SVG 资源及其加载阶段。

## 关键实现约定（详见 AGENTS.md）

- 命中判定：把箭尖沿垂直靶面插值求交点，不要用与圆形靶 sprite 的普通 overlap。
- 玩家和机器人共用同一套弹道/箭矢实现（`src/game/utils/ballistics.ts`）。
- 箭和金币掉落用对象池，回收时清理监听器、锁和挑战元数据。
- 射击收益必须经金币掉落和统一拾取路径入账；宝箱收益走奖励系统。
- 所有占位和正式视觉素材都是 `public/assets/svg/<分类>/` 下的 SVG 文件；禁止内联 SVG 字符串、位图或用 Phaser Graphics 替代最终素材。

## Phaser 技能

官方 Phaser 技能签入在 `.agents/skills/`（Codex 通过 `AGENTS.md` 引用读取）。为了让 Claude Code 也能自动发现，`.claude/skills/` 下每个技能是一个指向 `../../.agents/skills/<name>` 的符号链接——`.agents/skills/` 是唯一真实数据源，Claude Code 通过符号链接加载同一批文件，两侧不会漂移。**不要删除这些符号链接**；新增上游技能后，在 `.claude/skills/` 补一个对应符号链接（`ln -s ../../.agents/skills/<name> .claude/skills/<name>`）。会话启动前不存在的技能目录需重启 Claude Code 才能被监视到。

实现某个 Phaser 系统前，加载最小相关技能；Phaser 4 特性看 `v4-new-features`，评估 Phaser 3 写法时才看 `v3-to-v4-migration`。优先 Phaser 4.x API，不要在已有 Phaser 4 替代方案时引入 Phaser 3 专用写法。除非用户明确要求更新上游技能，否则不改动这些技能文件。
