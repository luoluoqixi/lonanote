import type { UiThemeConfig } from "rn-ui-kit";

/** 工作台的结构颜色保持中性，用户主题色继续用于动作与焦点。 */
export function composeWorkbenchTheme(
  base: UiThemeConfig,
  backgroundFollowsTheme: boolean,
): UiThemeConfig {
  if (backgroundFollowsTheme) return base;
  return {
    light: {
      ...base.light,
      background: "#FFFFFF",
      primaryBackground: "#FFFFFF",
      foreground: "#303030",
      card: "#FFFFFF",
      cardForeground: "#303030",
      popover: "#FFFFFF",
      popoverForeground: "#303030",
      muted: "#F3F3F3",
      mutedForeground: "#737373",
      secondary: "#ECECEC",
      secondaryForeground: "#303030",
      border: "#E5E5E5",
      input: "#D6D6D6",
      accent: "#E8E8E8",
      accentForeground: "#303030",
    },
    dark: {
      ...base.dark,
      background: "#1E1E1E",
      primaryBackground: "#1E1E1E",
      foreground: "#D4D4D4",
      card: "#252526",
      cardForeground: "#D4D4D4",
      popover: "#252526",
      popoverForeground: "#D4D4D4",
      muted: "#252526",
      mutedForeground: "#A0A0A0",
      secondary: "#333333",
      secondaryForeground: "#D4D4D4",
      border: "#383838",
      input: "#484848",
      accent: "#37373D",
      accentForeground: "#FFFFFF",
    },
  };
}
