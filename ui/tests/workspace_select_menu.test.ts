import { expect, test } from "bun:test";

import { getWorkspaceSelectSettingsMenuItems } from "../src/components/workspaces/workspace_select/workspace_select_menu";

const settingsItem = {
  label: "设置",
  onPress: () => {},
  value: "settings",
};

test("桌面端工作区选择菜单不显示设置入口和对应分隔线", () => {
  expect(
    getWorkspaceSelectSettingsMenuItems({
      embedded: true,
      settingsItem,
    }),
  ).toEqual([]);
});

test("移动端工作区选择菜单保留设置入口和对应分隔线", () => {
  expect(
    getWorkspaceSelectSettingsMenuItems({
      embedded: false,
      settingsItem,
    }).map((item) => item.value),
  ).toEqual(["separator-02", "settings"]);
});
