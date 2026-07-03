import type { GameEventBus } from "../events/GameEventBus";
import type { ProjectileResolution } from "./ProjectileSystem";
import type { SettingsService } from "./SettingsService";

type OscillatorType = "sine" | "triangle" | "square" | "sawtooth";

type NoteSpec = {
  readonly freq: number;
  readonly dur: number; // 秒
  readonly type?: OscillatorType;
  readonly gain?: number; // 相对增益（叠加时用小于 1 的值避免削波）
  readonly attack?: number;
  readonly glideTo?: number; // 结束频率，做音高滑音
  readonly filterHz?: number; // 低通截止，制造柔和感
  readonly delay?: number; // 相对当前时间的起始延迟（秒），用于琶音
};

// 常用音高（Hz），便于组织悦耳的琶音与和弦。
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568;

/**
 * 首版音效：使用 Web Audio 程序化合成，带包络、滑音与低通滤波，按事件分层设计出更悦耳、
 * 有层级的反馈音（命中环数、金币价值、购买、通关、挑战、祝福等）。按总音量 × 音效音量输出，
 * 静音时不发声。AudioContext 延迟到首次播放（用户手势后）创建。正式采样音效属于首版之后的替换项。
 */
export class AudioService {
  private context: AudioContext | undefined;
  private unavailable = false;

  constructor(
    private readonly events: GameEventBus,
    private readonly settings: SettingsService,
  ) {
    events.on("shot:fired", this.handleShot, this);
    events.on("arrow:resolved", this.handleResolved, this);
    events.on("coin:collected", this.handleCoin, this);
    events.on("shop:purchased", this.handlePurchase, this);
    events.on("reward:show", this.handleReward, this);
    events.on("challenge:started", this.handleChallengeStarted, this);
    events.on("challenge:ended", this.handleChallengeEnded, this);
    events.on("level:cleared", this.handleLevelCleared, this);
    events.on("blessing:selected", this.handleBlessingSelected, this);
  }

  destroy(): void {
    this.events.off("shot:fired", this.handleShot, this);
    this.events.off("arrow:resolved", this.handleResolved, this);
    this.events.off("coin:collected", this.handleCoin, this);
    this.events.off("shop:purchased", this.handlePurchase, this);
    this.events.off("reward:show", this.handleReward, this);
    this.events.off("challenge:started", this.handleChallengeStarted, this);
    this.events.off("challenge:ended", this.handleChallengeEnded, this);
    this.events.off("level:cleared", this.handleLevelCleared, this);
    this.events.off("blessing:selected", this.handleBlessingSelected, this);
    try {
      void this.context?.close();
    } catch {
      // 忽略关闭失败。
    }
    this.context = undefined;
  }

  // --- 事件音效 ---

  /** 射箭：一声快速下滑的弓弦拨动。 */
  private readonly handleShot = (): void => {
    this.play({ freq: 520, glideTo: 300, dur: 0.09, type: "triangle", gain: 0.5, filterHz: 1800 });
  };

  private readonly handleResolved = (resolution: ProjectileResolution): void => {
    if (!resolution.hit) {
      // 脱靶：低沉短促的闷响。
      this.play({ freq: 170, glideTo: 110, dur: 0.16, type: "sine", gain: 0.55, filterHz: 700 });
      return;
    }
    const ring = resolution.ring;
    if (ring >= 10) {
      if (resolution.runtimeData.source === "player") {
        // 玩家十环：上行铃铛琶音 + 高频闪光，全场峰值反馈。
        this.arp([C6, E6, G6], { type: "sine", gain: 0.9, step: 0.05, dur: 0.22 });
        this.play({ freq: 2093, dur: 0.32, type: "sine", gain: 0.35, delay: 0.02 });
      } else {
        // 机器人十环：单声柔和高音，明显弱于手动。
        this.play({ freq: G5, dur: 0.14, type: "sine", gain: 0.4 });
      }
      return;
    }
    if (ring >= 7) {
      // 高环：明亮双音（基音 + 五度泛音）。
      this.play({ freq: 520 + ring * 22, dur: 0.11, type: "triangle", gain: 0.55 });
      this.play({ freq: (520 + ring * 22) * 1.5, dur: 0.09, type: "sine", gain: 0.28, delay: 0.02 });
      return;
    }
    // 普通环：随环数升高的柔和短音。
    this.play({ freq: 380 + ring * 24, dur: 0.09, type: "triangle", gain: 0.5, filterHz: 2600 });
  };

  /** 金币入账：清脆的“叮”，价值越高越亮越长。 */
  private readonly handleCoin = ({ value }: { value: number }): void => {
    const bright = Math.min(1, Math.max(0, Math.log10(Math.max(1, value)) / 2.5)); // 0~1
    const base = 780 + bright * 340;
    this.play({ freq: base, glideTo: base * 1.35, dur: 0.08 + bright * 0.05, type: "sine", gain: 0.5 });
    this.play({ freq: base * 2, dur: 0.06, type: "sine", gain: 0.2 + bright * 0.18, delay: 0.015 });
  };

  /** 购买成功：向上的“叮咚”确认音。 */
  private readonly handlePurchase = (): void => {
    this.arp([C5, G5], { type: "triangle", gain: 0.6, step: 0.06, dur: 0.12 });
  };

  /** 宝箱/奖励出现：明亮的四音小号角。 */
  private readonly handleReward = (): void => {
    this.arp([C5, E5, G5, C6], { type: "sine", gain: 0.7, step: 0.07, dur: 0.2 });
  };

  /** 挑战开始：两声上行提示。 */
  private readonly handleChallengeStarted = (): void => {
    this.arp([G5, C6], { type: "square", gain: 0.35, step: 0.09, dur: 0.1 });
  };

  private readonly handleChallengeEnded = ({ success }: { success: boolean }): void => {
    if (success) {
      this.arp([C5, E5, G5, C6, G5], { type: "sine", gain: 0.8, step: 0.08, dur: 0.24 });
    } else {
      // 失败：下行的失落音。
      this.arp([523.25, 440, 349.23], { type: "sine", gain: 0.55, step: 0.11, dur: 0.26 });
    }
  };

  /** 通关：胜利的上行琶音 + 闪光。 */
  private readonly handleLevelCleared = (): void => {
    this.arp([G5, C6, E6, G6], { type: "sine", gain: 0.85, step: 0.08, dur: 0.26 });
    this.play({ freq: 2637, dur: 0.4, type: "sine", gain: 0.3, delay: 0.12 });
  };

  /** 选择祝福：柔和的魔法微光（叠加五度）。 */
  private readonly handleBlessingSelected = (): void => {
    this.play({ freq: A5, glideTo: C6, dur: 0.3, type: "sine", gain: 0.5, filterHz: 3000 });
    this.play({ freq: E6, dur: 0.24, type: "sine", gain: 0.2, delay: 0.05 });
  };

  // --- 合成原语 ---

  /** 依次以固定间隔播放一串音符，构成琶音。 */
  private arp(freqs: readonly number[], opts: { type: OscillatorType; gain: number; step: number; dur: number }): void {
    freqs.forEach((freq, index) => {
      this.play({ freq, dur: opts.dur, type: opts.type, gain: opts.gain, delay: index * opts.step });
    });
  }

  private play(spec: NoteSpec): void {
    const gain = this.settings.effectiveSfxGain * (spec.gain ?? 1);
    if (gain <= 0) {
      return;
    }
    const context = this.ensureContext();
    if (context === undefined) {
      return;
    }
    try {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = spec.type ?? "sine";

      const start = context.currentTime + (spec.delay ?? 0);
      const end = start + spec.dur;
      oscillator.frequency.setValueAtTime(spec.freq, start);
      if (spec.glideTo !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, spec.glideTo), end);
      }

      let node: AudioNode = oscillator;
      if (spec.filterHz !== undefined) {
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = spec.filterHz;
        oscillator.connect(filter);
        node = filter;
      }
      node.connect(envelope);
      envelope.connect(context.destination);

      const peak = Math.max(0.0002, gain * 0.24);
      const attack = spec.attack ?? 0.008;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.start(start);
      oscillator.stop(end + 0.03);
    } catch {
      // 单次播放失败不影响游戏。
    }
  }

  private ensureContext(): AudioContext | undefined {
    if (this.unavailable) {
      return undefined;
    }
    if (this.context === undefined) {
      const AudioContextCtor =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor === undefined) {
        this.unavailable = true;
        return undefined;
      }
      try {
        this.context = new AudioContextCtor();
      } catch {
        this.unavailable = true;
        return undefined;
      }
    }
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined);
    }
    return this.context;
  }
}
