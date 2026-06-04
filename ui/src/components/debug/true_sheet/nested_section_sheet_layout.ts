/** 嵌套分区 True Sheet 三档高度（与 `presentTrueSheet` 的 detentIndex 一一对应）。 */
export const DEBUG_NESTED_SECTION_SHEET_DETENTS = [0.5, 0.75, 1] as const;

export type DebugNestedSectionDetentLevel = 0 | 1 | 2;

export const DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN = 0 satisfies DebugNestedSectionDetentLevel;
export const DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX = 2 satisfies DebugNestedSectionDetentLevel;

const DEBUG_NESTED_SECTION_DETENT_LABELS = ["偏低 (50%)", "中等 (75%)", "全屏 (100%)"] as const;

export function clampDebugNestedSectionDetentLevel(level: number): DebugNestedSectionDetentLevel {
  const rounded = Math.round(level);
  if (rounded <= DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN) {
    return DEBUG_NESTED_SECTION_DETENT_LEVEL_MIN;
  }
  if (rounded >= DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX) {
    return DEBUG_NESTED_SECTION_DETENT_LEVEL_MAX;
  }
  return rounded as DebugNestedSectionDetentLevel;
}

export function getDebugNestedSectionDetentLabel(level: DebugNestedSectionDetentLevel): string {
  return DEBUG_NESTED_SECTION_DETENT_LABELS[level];
}
