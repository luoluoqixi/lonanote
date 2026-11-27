import type { SemanticColors } from "rn-ui-kit";

import type { EditorSemanticColors } from "@/assets/editor/src/bridge/protocol";

function softenAccent(primary: string, canvas: string): string {
  const parseHex = (value: string) => {
    const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
    if (!match) return null;
    const normalized =
      match.length === 3
        ? match
            .split("")
            .map((character) => character + character)
            .join("")
        : match;
    return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  };
  const primaryChannels = parseHex(primary);
  const canvasChannels = parseHex(canvas);
  if (!primaryChannels || !canvasChannels) return primary;
  const channels = primaryChannels.map((channel, index) =>
    Math.round(channel * 0.9 + canvasChannels[index] * 0.1),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * 将 rn-ui-kit 已解析完成的主题投影为 Editor 专用语义颜色。
 * Web surface 只消费最终颜色，不重复解析主题名或主色 seed。
 */
export function resolveEditorSemanticColors(
  theme: SemanticColors,
  colorScheme: "light" | "dark",
): EditorSemanticColors {
  const softenedAccent = softenAccent(theme.accent, theme.background);
  return {
    canvas: theme.background,
    text: theme.foreground,
    textMuted: theme.muted,
    accent: theme.accent,
    accentForeground: theme.accentForeground,
    caret: theme.accent,
    selection: theme.accent03,
    selectionInactive: theme.surfaceSecondary,
    gutterText: theme.muted,
    gutterActiveText: theme.foreground,
    border: theme.border,
    codeBackground: theme.surfaceSecondary,
    codeText: theme.foreground,
    // dark 下避免 primary container 形成大面积高饱和色块，保留主色文字作为强调。
    inlineCodeBackground: colorScheme === "dark" ? theme.surfaceSecondary : theme.accent03,
    inlineCodeText: colorScheme === "dark" ? theme.accent : theme.foreground,
    formatting: theme.accent,
    listMarker: softenedAccent,
    link: theme.accent,
    quoteBorder: softenedAccent,
    // 文本高亮是稳定的内容语义，不随应用主色变化。
    highlightBackground: colorScheme === "dark" ? "#665200" : "#fff0a3",
    checkboxBackground: theme.background,
    checkboxBorder: softenedAccent,
    checkboxChecked: softenedAccent,
    checkboxCheckmark: theme.accentForeground,
    scrollbarThumb: theme.border,
    scrollbarThumbActive: theme.muted,
  };
}
