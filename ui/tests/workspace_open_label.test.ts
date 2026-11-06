import { expect, test } from "bun:test";

import { getWorkspaceOpenLabel } from "../src/components/workspaces/workspace_select/workspace_open_label";

test("工作区标记区分当前窗口、其他窗口与未打开", () => {
  expect(getWorkspaceOpenLabel({ id: "a", isOpen: true }, "a")).toBe("已打开(当前窗口)");
  expect(getWorkspaceOpenLabel({ id: "b", isOpen: true }, "a")).toBe("已打开");
  expect(getWorkspaceOpenLabel({ id: "b", isOpen: true }, null)).toBe("已打开");
  expect(getWorkspaceOpenLabel({ id: "c", isOpen: false }, "a")).toBeUndefined();
  expect(getWorkspaceOpenLabel({ id: "a", isOpen: false }, "a")).toBeUndefined();
});
