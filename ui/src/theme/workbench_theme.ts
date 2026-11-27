import type { UiThemeConfig } from "rn-ui-kit";

/** 工作台背景保持中性，强调色由主题生成器提供。 */
export function composeWorkbenchTheme(base: UiThemeConfig): UiThemeConfig {
  return {
    light: { ...base.light, background: "#FFFFFF" },
    dark: { ...base.dark, background: "#1E1E1E" },
  };
}
