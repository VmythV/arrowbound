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

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
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
