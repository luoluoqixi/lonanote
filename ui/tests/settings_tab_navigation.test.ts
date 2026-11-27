import { expect, test } from "bun:test";

import { settingsTabTarget } from "../src/components/settings/settings_navigation";

test("设置侧栏方向键循环选择，Home/End 定位首尾，Tab 保留默认行为", () => {
  const ids = ["global", "appearance", "about"] as const;
  expect(settingsTabTarget(ids, "global", "ArrowDown")).toBe("appearance");
  expect(settingsTabTarget(ids, "about", "ArrowDown")).toBe("global");
  expect(settingsTabTarget(ids, "global", "ArrowUp")).toBe("about");
  expect(settingsTabTarget(ids, "appearance", "Home")).toBe("global");
  expect(settingsTabTarget(ids, "appearance", "End")).toBe("about");
  expect(settingsTabTarget(ids, "appearance", "Tab")).toBeUndefined();
  expect(settingsTabTarget([], "global", "Home")).toBeUndefined();
});
