import { expect, test } from "bun:test";

import {
  claimNativeDialogLaunch,
  claimNativeDialogWindowLaunch,
  claimNativeSettingsDialogLaunch,
  releaseNativeDialogWindowLaunch,
} from "../src/api/common/dialogs/dialog_launch_guard";

test("同一轮打开只启动一次，关闭后下一轮可重新启动", () => {
  const guard = { started: false };

  expect(claimNativeDialogLaunch(guard, true, true)).toBe(true);
  expect(claimNativeDialogLaunch(guard, true, true)).toBe(false);
  expect(claimNativeDialogLaunch(guard, false, true)).toBe(false);
  expect(claimNativeDialogLaunch(guard, true, true)).toBe(true);
});

test("只释放对应请求的启动租约，旧请求完成不能释放重开的窗口", () => {
  const key = "lease-regression";
  expect(claimNativeDialogWindowLaunch(key, true, "first")).toBe(true);
  expect(claimNativeDialogWindowLaunch(key, true, "duplicate")).toBe(false);
  releaseNativeDialogWindowLaunch(key, "first");
  expect(claimNativeDialogWindowLaunch(key, true, "second")).toBe(true);
  releaseNativeDialogWindowLaunch(key, "first");
  expect(claimNativeDialogWindowLaunch(key, true, "third")).toBe(false);
  releaseNativeDialogWindowLaunch(key, "second");
  expect(claimNativeDialogWindowLaunch(key, true, "third")).toBe(true);
  releaseNativeDialogWindowLaunch(key, "third");
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
