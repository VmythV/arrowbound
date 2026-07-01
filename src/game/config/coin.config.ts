import { ASSET_KEYS } from "./asset-manifest";

export type CoinTier = "small" | "normal" | "large" | "bag" | "glowing";

export type CoinTierVisual = {
  readonly tier: CoinTier;
  /** 该档位生效的最小金币价值（含）。 */
  readonly minValue: number;
  readonly assetKey: string;
  /** 掉落物显示缩放。 */
  readonly scale: number;
  /** 落地弹跳次数；高价值金币较少见，弹跳更明显，高频低价金币减少弹跳以降低噪声。 */
  readonly bounces: number;
  /** 是否为高价值金币，需要额外的柔和光圈表现。 */
  readonly glow: boolean;
};

/**
 * 金币价值到视觉档位的映射，按 `minValue` 升序排列。阈值为可调基线，
 * 后续可随数值试玩调整，但保持“价值越高、表现越强”的单调关系。
 */
export const COIN_TIER_VISUALS: readonly CoinTierVisual[] = [
  { tier: "small", minValue: 1, assetKey: ASSET_KEYS.coinSmall, scale: 0.55, bounces: 1, glow: false },
  { tier: "normal", minValue: 3, assetKey: ASSET_KEYS.coinBasic, scale: 0.7, bounces: 1, glow: false },
  { tier: "large", minValue: 8, assetKey: ASSET_KEYS.coinLarge, scale: 0.85, bounces: 2, glow: false },
  { tier: "bag", minValue: 20, assetKey: ASSET_KEYS.coinBag, scale: 0.95, bounces: 2, glow: true },
  { tier: "glowing", minValue: 60, assetKey: ASSET_KEYS.coinGlowing, scale: 1.05, bounces: 2, glow: true },
] as const;

/**
 * 根据金币价值选出对应档位。价值低于最小档位时归入最小档位。
 */
export function resolveCoinTier(value: number): CoinTierVisual {
  if (!Number.isFinite(value)) {
    throw new RangeError("Coin value must be finite");
  }
  let chosen = COIN_TIER_VISUALS[0];
  if (chosen === undefined) {
    throw new Error("Coin tier table is empty");
  }
  for (const visual of COIN_TIER_VISUALS) {
    if (value >= visual.minValue) {
      chosen = visual;
    }
  }
  return chosen;
}
