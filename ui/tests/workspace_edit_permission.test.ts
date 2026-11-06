import { expect, test } from "bun:test";

import { canEditWorkspace } from "../src/components/workspaces/workspace_select/workspace_edit_permission";

test("仅未打开工作区或当前窗口拥有的工作区允许编辑", () => {
  expect(canEditWorkspace({ id: "c", isOpen: false }, "a")).toBe(true);
  expect(canEditWorkspace({ id: "a", isOpen: true }, "a")).toBe(true);
  expect(canEditWorkspace({ id: "b", isOpen: true }, "a")).toBe(false);
  expect(canEditWorkspace({ id: "b", isOpen: true }, null)).toBe(false);
});
