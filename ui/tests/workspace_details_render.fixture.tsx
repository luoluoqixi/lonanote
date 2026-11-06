import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window();
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "ShadowRoot",
]) {
  globalThis[key] = key === "window" ? win : win[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const rn = await import("react-native-web");
mock.module("react-native", () => rn);
mock.module("rn-ui-kit", () => ({
  Text: rn.Text,
  NativeListCustomItem: rn.View,
  NativeListItem: () => null,
}));
mock.module("../src/api/commands/system", () => ({ clipboard: {} }));
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode: "desktop" }) }));
mock.module("../src/hooks/ui", () => ({ useToast: () => ({ toast: {} }) }));
// 保留真实 Tooltip 的额外根容器，避免透传 children 掩盖列宽问题。
mock.module("../src/components/files/file_path_tooltip", () => ({
  FilePathTooltip: ({ children, path }) => (
    <rn.View dataSet={{ tooltip: path ?? "" }}>{children}</rn.View>
  ),
}));
const { WorkspaceDetailsListItem } =
  await import("../src/components/workspaces/workspace_details_list_item");

test("详情 value 在 Tooltip 外分配列宽，文本铺满并右对齐，长路径使用单行省略", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const path = "C:/notes/" + "long-folder/".repeat(40) + "note.md";
  try {
    await act(() =>
      root.render(
        <WorkspaceDetailsListItem title="本地文件夹路径" copyId="path" value={path} tooltip />,
      ),
    );
    const tooltip = container.querySelector("[data-tooltip]");
    expect(tooltip.getAttribute("data-tooltip")).toBe(path);
    expect(win.getComputedStyle(tooltip.parentElement).flex).toBe("1 1 0%");
    expect(win.getComputedStyle(tooltip.parentElement).minWidth).toBe("0px");
    const text = [...container.querySelectorAll("div")].find(
      (node) => node.textContent === path && node.children.length === 0,
    );
    expect(win.getComputedStyle(text).width).toBe("100%");
    expect(win.getComputedStyle(text).textAlign).toBe("right");
    // 使用真实 RN Web Text，检查 numberOfLines 实际生成的截断规则。
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
    const css = rules
      .filter((rule) =>
        rule.selectorText?.split(",").some((selector) => text.matches(selector.trim())),
      )
      .map((rule) => rule.cssText)
      .join("\n");
    expect(css).toContain("text-overflow: ellipsis");
    expect(css).toContain("white-space: nowrap");
    expect(css).toContain("overflow");
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});
