import { expect, test } from "bun:test";
import type { UiThemeConfig } from "rn-ui-kit";

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
