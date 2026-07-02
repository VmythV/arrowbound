import type { SettingsSaveData } from "../state/SaveData";

const DEFAULT_SETTINGS: SettingsSaveData = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
};

function clampVolume(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * 音量与静音设置的内存态持有者，从存档 seed。音频接线在阶段 12 完成，
 * 本阶段负责让设置随存档持久化与恢复。
 */
export class SettingsService {
  private masterVolume: number;
  private musicVolume: number;
  private sfxVolume: number;
  private mutedFlag: boolean;

  constructor(settings: SettingsSaveData = DEFAULT_SETTINGS) {
    this.masterVolume = clampVolume(settings.masterVolume, DEFAULT_SETTINGS.masterVolume);
    this.musicVolume = clampVolume(settings.musicVolume, DEFAULT_SETTINGS.musicVolume);
    this.sfxVolume = clampVolume(settings.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
    this.mutedFlag = settings.muted === true;
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  get master(): number {
    return this.masterVolume;
  }

  get music(): number {
    return this.musicVolume;
  }

  get sfx(): number {
    return this.sfxVolume;
  }

  /** 音效实际输出增益：静音时为 0，否则为总音量 × 音效音量。 */
  get effectiveSfxGain(): number {
    return this.mutedFlag ? 0 : this.masterVolume * this.sfxVolume;
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
  }

  setMaster(value: number): void {
    this.masterVolume = clampVolume(value, this.masterVolume);
  }

  setMusic(value: number): void {
    this.musicVolume = clampVolume(value, this.musicVolume);
  }

  setSfx(value: number): void {
    this.sfxVolume = clampVolume(value, this.sfxVolume);
  }

  toSaveData(): SettingsSaveData {
    return {
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.mutedFlag,
    };
  }
}
