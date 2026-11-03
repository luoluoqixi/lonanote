import { afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useEffect, useState } from "react";

const win = new Window();
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "Event", "MouseEvent"]) {
  globalThis[key] = key === "window" ? win : win[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const { DesktopSidePanelSurface } =
  await import("../src/components/app_shell/desktop_side_panel_surface.web");
mock.module("../src/components/app_shell/desktop_side_panel_surface", () => ({
  DesktopSidePanelSurface,
}));
const { DesktopSidePanel } = await import("../src/components/app_shell/desktop_side_panel");
let root;
afterEach(async () => {
  await act(() => root?.unmount());
  document.body.replaceChildren();
});

test("首次访问才加载，切换后保留节点、局部状态和滚动，隐藏页隔离交互", async () => {
  const mounts = [],
    unmounts = [];
  function Content({ id }) {
    const [selected, setSelected] = useState("初始");
    useEffect(() => {
      mounts.push(id);
      return () => unmounts.push(id);
    }, []);
    return (
      <div data-panel={id} style={{ overflow: "auto" }}>
        <button onClick={() => setSelected("已选中文件")}>{selected}</button>
      </div>
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  async function show(panel) {
    await act(() =>
      root.render(
        <>
          <DesktopSidePanel active={panel === "explorer"}>
            <Content id="explorer" />
          </DesktopSidePanel>
          <DesktopSidePanel active={panel === "search"}>
            <Content id="search" />
          </DesktopSidePanel>
        </>,
      ),
    );
  }
  await show("explorer");
  expect(mounts).toEqual(["explorer"]);
  const explorer = container.querySelector('[data-panel="explorer"]');
  await act(() => explorer.querySelector("button").click());
  explorer.scrollTop = 120;
  await show("search");
  expect(mounts).toEqual(["explorer", "search"]);
  expect(unmounts).toEqual([]);
  const hidden = explorer.parentElement;
  expect(hidden.hasAttribute("inert")).toBe(true);
  expect(hidden.getAttribute("aria-hidden")).toBe("true");
  expect(hidden.style.visibility).toBe("hidden");
  expect(hidden.style.display).not.toBe("none");
  await show("explorer");
  expect(container.querySelector('[data-panel="explorer"]')).toBe(explorer);
  expect(explorer.scrollTop).toBe(120);
  expect(explorer.textContent).toBe("已选中文件");
  expect(explorer.parentElement.hasAttribute("inert")).toBe(false);
  await show(null);
  await show("search");
  expect(mounts).toEqual(["explorer", "search"]);
  expect(unmounts).toEqual([]);
});
