import type { GameEventBus } from "../events/GameEventBus";
import type { ProjectileResolution } from "./ProjectileSystem";
import type { SettingsService } from "./SettingsService";

type OscillatorType = "sine" | "triangle" | "square" | "sawtooth";

/**
 * 首版基础音效：使用 Web Audio 程序化短音，按设置的总音量 × 音效音量输出，静音时不发声。
 * 正式音效资源属于首版之后的替换项。AudioContext 延迟到首次播放（用户手势后）创建。
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
    events.on("challenge:ended", this.handleChallengeEnded, this);
  }

  destroy(): void {
    this.events.off("shot:fired", this.handleShot, this);
    this.events.off("arrow:resolved", this.handleResolved, this);
    this.events.off("coin:collected", this.handleCoin, this);
    this.events.off("shop:purchased", this.handlePurchase, this);
    this.events.off("reward:show", this.handleReward, this);
    this.events.off("challenge:ended", this.handleChallengeEnded, this);
    try {
      void this.context?.close();
    } catch {
      // 忽略关闭失败。
    }
    this.context = undefined;
  }

  private readonly handleShot = (): void => this.tone(320, 90, "triangle", 0.9);

  private readonly handleResolved = (resolution: ProjectileResolution): void => {
    if (!resolution.hit) {
      this.tone(150, 130, "sine", 0.7);
      return;
    }
    if (resolution.ring === 10 && resolution.runtimeData.source === "player") {
      this.tone(880, 150, "sine", 1);
      this.tone(1320, 200, "sine", 0.8);
      return;
    }
    this.tone(440 + resolution.ring * 26, 90, "triangle", 0.7);
  };

  private readonly handleCoin = (): void => this.tone(760, 70, "sine", 0.6);

  private readonly handlePurchase = (): void => this.tone(600, 100, "triangle", 0.8);

  private readonly handleReward = (): void => {
    this.tone(660, 130, "sine", 0.9);
    this.tone(990, 180, "sine", 0.7);
  };

  private readonly handleChallengeEnded = ({ success }: { success: boolean }): void => {
    if (success) {
      this.tone(660, 160, "sine", 0.9);
      this.tone(990, 220, "sine", 0.8);
    } else {
      this.tone(300, 260, "sine", 0.7);
    }
  };

  private tone(frequency: number, durationMs: number, type: OscillatorType, gainScale: number): void {
    const gain = this.settings.effectiveSfxGain * gainScale;
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
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(envelope);
      envelope.connect(context.destination);

      const now = context.currentTime;
      const peak = Math.max(0.0002, gain * 0.28);
      const end = now + durationMs / 1_000;
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.start(now);
      oscillator.stop(end + 0.02);
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
