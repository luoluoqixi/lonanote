import { expect, test } from "bun:test";
import type { UiThemeConfig } from "rn-ui-kit";

import {
  STANDARD_IOS_BACKGROUND_COLORS,
  WORKBENCH_BACKGROUND_COLORS,
} from "../src/theme/app_background";
import { composeWorkbenchTheme } from "../src/theme/workbench_theme";

test("工作台使用中性色并保留用户强调色，背景跟随主题时保持原主题", () => {
  const base = {
    light: { primary: "#123456", background: "pink" },
    dark: { primary: "#abcdef", background: "purple" },
  } as UiThemeConfig;
  const neutral = composeWorkbenchTheme(base, false);
  expect(neutral.light.background).toBe("#FFFFFF");
  expect(neutral.dark.background).toBe("#1E1E1E");
  expect(neutral.light.primary).toBe(base.light.primary);
  expect(neutral.dark.primary).toBe(base.dark.primary);
  expect(composeWorkbenchTheme(base, true)).toBe(base);
  expect(base.light.background).toBe("pink");
});

test("桌面页面、弹层与标题底色对齐工作台画布，移动端保留分组背景", () => {
  const neutral = composeWorkbenchTheme({ light: {}, dark: {} } as UiThemeConfig, false);
  for (const scheme of ["light", "dark"] as const) {
    const backgrounds = WORKBENCH_BACKGROUND_COLORS.false![scheme];
    expect(backgrounds.screen).toBe(neutral[scheme].background);
    expect(backgrounds.header).toBe(backgrounds.screen);
    expect(backgrounds.sheet).toBe(backgrounds.screen);
    expect(backgrounds.card).not.toBe(backgrounds.screen);
  }
  expect(STANDARD_IOS_BACKGROUND_COLORS.false!.light.screen).toBe("#F2F2F7");
});
