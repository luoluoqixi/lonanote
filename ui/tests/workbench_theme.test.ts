import { expect, test } from "bun:test";
import type { UiThemeConfig } from "rn-ui-kit";

import {
  STANDARD_IOS_BACKGROUND_COLORS,
  WORKBENCH_BACKGROUND_COLORS,
} from "../src/theme/app_background";
import { composeWorkbenchTheme } from "../src/theme/workbench_theme";

test("工作台始终使用中性背景并保留用户强调色", () => {
  const base = {
    light: { accent: "#123456", background: "pink" },
    dark: { accent: "#abcdef", background: "purple" },
  } as UiThemeConfig;
  const neutral = composeWorkbenchTheme(base);
  expect(neutral.light.background).toBe("#FFFFFF");
  expect(neutral.dark.background).toBe("#1E1E1E");
  expect(neutral.light.accent).toBe(base.light.accent);
  expect(neutral.dark.accent).toBe(base.dark.accent);
  expect(base.light.background).toBe("pink");
});

test("桌面页面、弹层与标题底色对齐工作台画布，移动端保留分组背景", () => {
  const neutral = composeWorkbenchTheme({ light: {}, dark: {} } as UiThemeConfig);
  for (const scheme of ["light", "dark"] as const) {
    const backgrounds = WORKBENCH_BACKGROUND_COLORS[scheme]!;
    expect(backgrounds.screen).toBe(neutral[scheme].background);
    expect(backgrounds.header).toBe(backgrounds.screen);
    expect(backgrounds.sheet).toBe(backgrounds.screen);
    expect(backgrounds.card).not.toBe(backgrounds.screen);
  }
  expect(STANDARD_IOS_BACKGROUND_COLORS.light!.screen).toBe("#F2F2F7");
});
