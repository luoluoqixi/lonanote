import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window({ url: "http://localhost/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "ShadowRoot",
])
  globalThis[key] = key === "window" ? win : win[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const RNW = await import("react-native-web");
mock.module("react-native", () => RNW);
const theme = { foreground: "#111111", muted: "#777777", background: "#ffffff", border: "#dddddd" };
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/theme", () => ({
  useUiTheme: () => theme,
}));
mock.module("lucide-react-native", () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  ChevronsUpDown: () => null,
}));
mock.module("rn-ui-kit", () => ({ Text: RNW.Text, useUiTheme: () => theme }));
mock.module("@/config", () => ({ TITLE_HEIGHT: 32 }));
mock.module("@/api/common/platform", () => ({ isDesktop: () => true, os: () => "windows" }));
mock.module("@/api/common", () => ({ isDesktop: () => true, os: () => "windows" }));
mock.module("@/components/app_menu/app_menu_host", () => ({
  useAppMenuContext: () => ({ presentation: { visible: true, native: true } }),
}));
mock.module("@/components/app_menu/app_menubar", () => ({ AppMenubar: () => null }));
mock.module("@/hooks/editor/use_desktop_window_title", () => ({
  useWindowTitle: () => "测试工作区",
}));
mock.module("@/hooks/ui/use_separator_color", () => ({ useSeparatorColor: () => "#dddddd" }));
mock.module("@/components/window/titlebar_drag_overlay", () => ({
  TitleBarDragOverlay: () => null,
}));
mock.module("@/components/window/window_controls", () => ({
  WindowControls: () => null,
  WindowPinControl: () => null,
}));
const { NativeTriggerFace } =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/native_trigger/native_trigger");
const { TitleBar } = await import("../src/components/window/titlebar");
const { EditorTitleBar } = await import("../src/components/window/editor_titlebar");
const { createRoot } = await import("react-dom/client");

test("标题栏和列表选择器外观不使用已弃用的 pointerEvents prop，并保持点击穿透", async () => {
  const messages: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    messages.push(args.join(" "));
  };
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  try {
    await act(() =>
      root.render(
        <>
          <TitleBar />
          <EditorTitleBar title="独立编辑器" />
          <NativeTriggerFace label="系统" />
          <NativeTriggerFace content={<RNW.Text>自定义值</RNW.Text>} />
        </>,
      ),
    );
    expect(messages.filter((message) => message.includes("props.pointerEvents"))).toEqual([]);
    expect(
      [...host.querySelectorAll("div")].filter(
        (node) => win.getComputedStyle(node).pointerEvents === "none",
      ).length,
    ).toBeGreaterThanOrEqual(4);
    expect(host.textContent).toContain("测试工作区");
    expect(host.textContent).toContain("自定义值");
  } finally {
    console.warn = originalWarn;
    await act(() => root.unmount());
    host.remove();
  }
});
