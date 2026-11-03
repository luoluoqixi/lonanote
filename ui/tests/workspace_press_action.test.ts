import { expect, test } from "bun:test";

import { resolveWorkspacePressAction } from "../src/components/workspaces/workspace_select/workspace_press_action";

test("桌面 UI 重复点击当前工作区只提示，不进入切换或导航流程", () => {
  expect(resolveWorkspacePressAction("desktop", "current", "current")).toBe("notifyAlreadyOpen");
});

test("移动 UI 重复点击当前工作区仍返回工作区页面", () => {
  expect(resolveWorkspacePressAction("mobile", "current", "current")).toBe("returnToWorkspace");
});

test("两种 UI 模式下点击其他工作区或首次打开仍执行打开流程", () => {
  for (const mode of ["desktop", "mobile"] as const) {
    expect(resolveWorkspacePressAction(mode, "current", "other")).toBe("openWorkspace");
    expect(resolveWorkspacePressAction(mode, null, "other")).toBe("openWorkspace");
  }
});
