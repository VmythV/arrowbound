export type BlessingId =
  | "gold_bonus_30"
  | "ten_ring_bonus"
  | "stable_bow"
  | "quick_shot"
  | "large_center"
  | "wide_target"
  | "robot_frenzy"
  | "robot_calibration"
  | "pet_excitement"
  | "lucky_first_ten";

export type BlessingEffectType =
  | "all_coin_multiplier"
  | "ten_ring_coin_multiplier"
  | "bow_speed_multiplier"
  | "player_cooldown_multiplier"
  | "center_radius_multiplier"
  | "target_radius_multiplier"
  | "robot_interval_divisor"
  | "robot_minimum_ring"
  | "pet_interval_divisor"
  | "lucky_first_ten";

export type BlessingAvailability = "always" | "has_robot" | "has_coin_pet";

export type BlessingConfig = {
  readonly id: BlessingId;
  readonly name: string;
  readonly description: string;
  readonly effectType: BlessingEffectType;
  readonly value: number;
  readonly weight: number;
  readonly availability: BlessingAvailability;
};

export const BLESSING_CONFIGS: readonly BlessingConfig[] = [
  blessing("gold_bonus_30", "金币祝福", "本关所有金币价值提高百分之三十", "all_coin_multiplier", 1.3, 10),
  blessing("ten_ring_bonus", "十环狂热", "本关十环金币价值翻倍", "ten_ring_coin_multiplier", 2, 7),
  blessing("stable_bow", "稳定拉弓", "本关弓摆动速度降至百分之八十", "bow_speed_multiplier", 0.8, 8),
  blessing("quick_shot", "快速射击", "本关玩家最终冷却降至百分之八十", "player_cooldown_multiplier", 0.8, 8),
  blessing("large_center", "巨大靶心", "本关十环半径扩大百分之二十", "center_radius_multiplier", 1.2, 7),
  blessing("wide_target", "宽大靶子", "本关靶子总半径扩大百分之十五", "target_radius_multiplier", 1.15, 7),
  blessing("robot_frenzy", "机械狂欢", "本关机器人射击间隔除以一点五", "robot_interval_divisor", 1.5, 5, "has_robot"),
  blessing("robot_calibration", "机械校准", "机器人抽到一至二环时改为三环", "robot_minimum_ring", 3, 5, "has_robot"),
  blessing("pet_excitement", "宠物兴奋", "本关宠物拾取间隔减半", "pet_interval_divisor", 2, 5, "has_coin_pet"),
  blessing("lucky_first_ten", "幸运首箭", "本关首次手动十环获得金币小宝箱", "lucky_first_ten", 0.1, 3),
] as const;

function blessing(
  id: BlessingId,
  name: string,
  description: string,
  effectType: BlessingEffectType,
  value: number,
  weight: number,
  availability: BlessingAvailability = "always",
): BlessingConfig {
  return { id, name, description, effectType, value, weight, availability };
}
