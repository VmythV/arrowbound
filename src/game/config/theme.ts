/**
 * 暖色卡通视觉主题常量（见 docs/07 与 docs/08）。
 * 字符串色用于文本与场景内 CSS 风格属性；`hex` 数值色用于 Phaser tint 与 Graphics。
 * 不要在系统逻辑里散布颜色字面量，统一从这里引用。
 */
export const THEME = {
  fonts: {
    // 圆体展示字优先，未打包时回退到系统圆体，再回退无衬线。
    display:
      '"Baloo 2", "Fredoka", "Segoe UI Rounded", "Arial Rounded MT Bold", "Noto Sans SC", system-ui, sans-serif',
    body: '"Noto Sans SC", "Inter", system-ui, sans-serif',
  },
  radius: { panel: 20, button: 16, card: 18 },
  color: {
    // 世界层
    skyTop: "#FFD9A0",
    skyBot: "#7FC8E8",
    hill: "#B8D9C4",
    grassHi: "#8FD06A",
    grassMid: "#4FA85C",
    grassLo: "#2E7D4F",
    soil: "#C98A4B",
    // UI 层
    panel: "#241B36",
    panelAlt: "#2E2450",
    stroke: "#F4B860",
    // 语义层
    ctaA: "#FF9F45",
    ctaB: "#FFC65C",
    ok: "#4CD07D",
    danger: "#FF6B5C",
    magic: "#B98CFF",
    disabled: "#6E6486",
    title: "#FFF6E6",
    body: "#EAD9C4",
    muted: "#B7A8C9",
    // 反馈层
    coin: "#FFD24A",
    coinHi: "#FFF6C8",
    coinPop: "#FFF3B0",
    crit: "#FF5C8A",
    high: "#FFC65C",
    spark: "#FFE79A",
  },
  hex: {
    panel: 0x241b36,
    panelAlt: 0x2e2450,
    stroke: 0xf4b860,
    shadow: 0x140e22,
    ctaA: 0xff9f45,
    ctaB: 0xffc65c,
    ok: 0x4cd07d,
    danger: 0xff6b5c,
    magic: 0xb98cff,
    coin: 0xffd24a,
    coinHi: 0xfff6c8,
    crit: 0xff5c8a,
    high: 0xffc65c,
  },
} as const;
