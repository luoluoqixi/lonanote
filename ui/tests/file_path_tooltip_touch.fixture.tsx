import { afterAll, afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window({ url: "http://localhost/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLButtonElement",
  "HTMLAnchorElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "SVGElement",
  "Element",
  "Node",
  "NodeFilter",
  "HTMLLabelElement",
  "Event",
  "CustomEvent",
  "FocusEvent",
  "Document",
  "HTMLFormElement",
  "HTMLSelectElement",
  "DOMRect",
  "Range",
  "InputEvent",
  "MouseEvent",
  "KeyboardEvent",
  "PointerEvent",
  "ShadowRoot",
  "MutationObserver",
  "ResizeObserver",
  "CSSRuleList",
  "CSS",
])
  globalThis[key] = key === "window" ? win : win[key];
globalThis.getComputedStyle = win.getComputedStyle.bind(win);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame = win.cancelAnimationFrame.bind(win);

const RNW = await import("react-native-web");
mock.module("../node_modules/rn-ui-kit/node_modules/react/index.js", () => ({
  default: React,
  ...React,
}));
const ReactDOM = await import("react-dom");
mock.module("../node_modules/rn-ui-kit/node_modules/react-dom/index.js", () => ReactDOM);
mock.module("react-native", () => RNW);
mock.module("../node_modules/rn-ui-kit/node_modules/react-native", () => RNW);
// 样式与原生桥不参与按压边界；RNW、React Aria 和 HeroUI 保留真实实现。
mock.module("uniwind", () => ({
  withUniwind: (component) => component,
  useCSSVariable: () => "#123456",
  ScopedVariables: ({ children }) => children,
  Uniwind: { updateCSSVariables() {}, setTheme() {} },
  useUniwind: () => ({ theme: "light" }),
}));
mock.module("../node_modules/rn-ui-kit/node_modules/uniwind/dist/module/index.js", () => ({
  withUniwind: (component) => component,
  useCSSVariable: () => "#123456",
  ScopedVariables: ({ children }) => children,
  Uniwind: { updateCSSVariables() {}, setTheme() {} },
  useUniwind: () => ({ theme: "light" }),
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/haptics", () => ({
  useResolvedNativeHaptics: () => false,
  triggerNativeHaptics() {},
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/button/button_loading_icon", () => ({
  ButtonLoadingIcon: ({ children }) => children,
}));
const svg: Record<string, unknown> = {};
for (const name of [
  "Svg",
  "Path",
  "Circle",
  "G",
  "Defs",
  "LinearGradient",
  "Stop",
  "Rect",
  "Line",
  "Polyline",
  "Polygon",
  "Ellipse",
  "ClipPath",
  "Mask",
  "Text",
  "TSpan",
  "Use",
  "Symbol",
  "Pattern",
  "Image",
  "RadialGradient",
])
  svg[name] = React.forwardRef(({ children, ...props }: any, ref) =>
    React.createElement(name === "Svg" ? "svg" : name.toLowerCase(), { ...props, ref }, children),
  );
mock.module("react-native-svg", () => ({ default: svg.Svg, ...svg }));
const scope =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/overlay_portal_scope.web");
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/overlay_portal_scope",
  () => scope,
);
const { Tooltip } = await import("../node_modules/rn-ui-kit/src/core/components/ui/tooltip");
const { ContextMenuHeroUI: ContextMenu } =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/context_menu/context_menu_heroui");
mock.module("rn-ui-kit", () => ({ Tooltip }));
mock.module("../src/api/common/platform", () => ({ isWeb: () => true }));
const { FilePathTooltip } = await import("../src/components/files/file_path_tooltip");
const { createRoot } = await import("react-dom/client");

const diagnostics: string[] = [];
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  diagnostics.push(args.map(String).join(" "));
  originalWarn(...args);
};
console.error = (...args) => {
  diagnostics.push(args.map(String).join(" "));
  originalError(...args);
};
let root: ReturnType<typeof createRoot> | undefined;
const listeners: (() => void)[] = [];
afterEach(async () => {
  await act(() => root?.unmount());
  root = undefined;
  for (const remove of listeners.splice(0)) remove();
  document.body.replaceChildren();
  diagnostics.length = 0;
});
afterAll(async () => {
  console.error = originalError;
  console.warn = originalWarn;
  await win.happyDOM.close();
});

async function renderPressable(role: "treeitem" | "tab", disabled = false, withMenu = false) {
  const lifecycle: string[] = [];
  const reachedDocument: string[] = [];
  for (const type of ["mousedown", "mouseup", "touchstart", "touchend"]) {
    const record = () => reachedDocument.push(type);
    document.addEventListener(type, record);
    listeners.push(() => document.removeEventListener(type, record));
  }
  const mount = document.createElement("div");
  document.body.append(mount);
  root = createRoot(mount);
  const target = (
    <RNW.Pressable
      testID="target"
      accessibilityRole={role}
      onPressIn={() => lifecycle.push("in")}
      onPressOut={() => lifecycle.push("out")}
      onPress={() => lifecycle.push("press")}
    >
      <RNW.Text>note.md</RNW.Text>
    </RNW.Pressable>
  );
  await act(() =>
    root!.render(
      <FilePathTooltip path="folder/note.md" disabled={disabled}>
        {withMenu ? (
          <ContextMenu
            native={false}
            trigger={target}
            triggerProps={{ asChild: true }}
            items={[{ value: "close", label: "关闭测试标签" }]}
          />
        ) : (
          <RNW.View role="presentation">{target}</RNW.View>
        )}
      </FilePathTooltip>,
    ),
  );
  return { target: document.querySelector('[data-testid="target"]')!, lifecycle, reachedDocument };
}

async function mousePress(target: Element) {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    const init = {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: type.endsWith("down") ? 1 : 0,
      clientX: 20,
      clientY: 10,
      detail: 1,
    };
    await act(() =>
      target.dispatchEvent(
        type.startsWith("pointer")
          ? new win.PointerEvent(type, {
              ...init,
              pointerId: 1,
              pointerType: "mouse",
              width: 1,
              height: 1,
            })
          : new win.MouseEvent(type, init),
      ),
    );
  }
}

// 此用例必须首先运行；旧适配会吞掉首个 mousedown，正好复现空 Touch Bank。
test("文件行首次普通左键按下和抬起均到达 RNW，打开一次且无 touch history 警告", async () => {
  const probe = await renderPressable("treeitem");
  await mousePress(probe.target);
  expect(probe.reachedDocument).toEqual(["mousedown", "mouseup"]);
  expect(probe.lifecycle).toEqual(["in", "out", "press"]);
  expect(diagnostics.filter((message) => /Cannot record touch|Touch Bank:/.test(message))).toEqual(
    [],
  );
});

test("真实标签组合保留左键生命周期，并能通过右键打开应用菜单", async () => {
  const probe = await renderPressable("tab", false, true);
  await mousePress(probe.target);
  expect(probe.reachedDocument).toEqual(["mousedown", "mouseup"]);
  expect(probe.lifecycle).toEqual(["in", "out", "press"]);
  const context = new win.MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: 20,
    clientY: 10,
  });
  await act(() => probe.target.dispatchEvent(context));
  expect(context.defaultPrevented).toBe(true);
  expect(document.querySelector('[role="menu"]')).not.toBeNull();
  expect(document.body.textContent).toContain("关闭测试标签");
  expect(
    diagnostics.filter((message) =>
      /Cannot record touch|Touch Bank:|PressResponder was rendered|Pressable> child/.test(message),
    ),
  ).toEqual([]);
});

test("禁用路径提示仍保留标签页完整鼠标按压生命周期", async () => {
  const probe = await renderPressable("tab", true);
  await mousePress(probe.target);
  expect(probe.reachedDocument).toEqual(["mousedown", "mouseup"]);
  expect(probe.lifecycle).toEqual(["in", "out", "press"]);
});

test("路径提示不干扰真实 RNW touchstart/touchend 的打开动作", async () => {
  const probe = await renderPressable("treeitem");
  const touch = {
    identifier: 4,
    target: probe.target,
    clientX: 20,
    clientY: 10,
    pageX: 20,
    pageY: 10,
    force: 1,
  };
  for (const type of ["touchstart", "touchend"]) {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      changedTouches: [touch],
      touches: type === "touchstart" ? [touch] : [],
    });
    await act(() => probe.target.dispatchEvent(event));
  }
  // RNW 将触摸的最终激活交给浏览器随后发出的 click。
  await act(() =>
    probe.target.dispatchEvent(
      new win.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
        detail: 1,
      }),
    ),
  );
  expect(probe.reachedDocument).toEqual(["touchstart", "touchend"]);
  expect(probe.lifecycle).toEqual(["in", "out", "press"]);
  expect(diagnostics.filter((message) => /Cannot record touch|Touch Bank:/.test(message))).toEqual(
    [],
  );
});
