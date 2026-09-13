import type { SemanticColors } from "rn-ui-kit";

import type { EditorSemanticColors } from "@/assets/editor/src/bridge/protocol";

/**
 * 将 rn-ui-kit 已解析完成的主题投影为 Editor 专用语义颜色。
 * Web surface 只消费最终颜色，不重复解析主题名或主色 seed。
 */
export function resolveEditorSemanticColors(
  theme: SemanticColors,
  colorScheme: "light" | "dark",
): EditorSemanticColors {
  return {
    canvas: theme.background,
    text: theme.foreground,
    textMuted: theme.mutedForeground,
    accent: theme.primary,
    accentForeground: theme.primaryForeground,
    caret: theme.primary,
    selection: theme.accent,
    selectionInactive: theme.muted,
    gutterText: theme.mutedForeground,
    gutterActiveText: theme.foreground,
    border: theme.border,
    codeBackground: theme.muted,
    codeText: theme.foreground,
    // dark 下避免 primary container 形成大面积高饱和色块，保留主色文字作为强调。
    inlineCodeBackground: colorScheme === "dark" ? theme.muted : theme.accent,
    inlineCodeText: colorScheme === "dark" ? theme.primary : theme.accentForeground,
    formatting: theme.primary,
    link: theme.primary,
    quoteBorder: theme.primary,
    // 文本高亮是稳定的内容语义，不随应用主色变化。
    highlightBackground: colorScheme === "dark" ? "#665200" : "#fff0a3",
    checkboxBackground: theme.background,
    checkboxBorder: theme.primary,
    checkboxChecked: theme.primary,
    checkboxCheckmark: theme.primaryForeground,
    scrollbarThumb: theme.border,
    scrollbarThumbActive: theme.mutedForeground,
  };
}
