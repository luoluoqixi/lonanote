import { expect, test } from "bun:test";

import {
  claimNativeDialogLaunch,
  claimNativeSettingsDialogLaunch,
} from "../src/api/common/dialogs/dialog_launch_guard";

test("同一轮打开只启动一次，关闭后下一轮可重新启动", () => {
  const guard = { started: false };

  expect(claimNativeDialogLaunch(guard, true, true)).toBe(true);
  expect(claimNativeDialogLaunch(guard, true, true)).toBe(false);
  expect(claimNativeDialogLaunch(guard, false, true)).toBe(false);
  expect(claimNativeDialogLaunch(guard, true, true)).toBe(true);
});

test("原生弹窗未启用时不占用本轮启动机会", () => {
  const guard = { started: false };

  expect(claimNativeDialogLaunch(guard, true, false)).toBe(false);
  expect(claimNativeDialogLaunch(guard, true, true)).toBe(true);
});

test("设置组件重挂载后仍只启动一个原生窗口", () => {
  expect(claimNativeSettingsDialogLaunch(false, true)).toBe(false);
  expect(claimNativeSettingsDialogLaunch(true, true)).toBe(true);
  // 新组件实例仍复用模块级启动状态。
  expect(claimNativeSettingsDialogLaunch(true, true)).toBe(false);
  expect(claimNativeSettingsDialogLaunch(false, true)).toBe(false);
  expect(claimNativeSettingsDialogLaunch(true, true)).toBe(true);
});
