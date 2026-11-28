import { afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window({ url: "http://localhost/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLDivElement",
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
mock.module("react-native", () => RNW);
mock.module("uniwind", () => ({ withUniwind: (value) => value, useCSSVariable: () => "#2563eb" }));
mock.module("@react-navigation/native", () => ({
  NavigationContext: React.createContext(undefined),
}));
mock.module("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
const theme = {
  background: "#fff",
  foreground: "#111",
  accent: "#2563eb",
  accent03: "#dbeafe",
  border: "#ddd",
  muted: "#777777",
  surface: "#f0f0f0",
  surfaceSecondary: "#eeeeee",
};
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/theme", () => ({
  useUiTheme: () => theme,
  useAppBackgroundColors: () => ({ screen: "#fafafa", card: "#fff" }),
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/haptics", () => ({
  useResolvedNativeHaptics: () => false,
  triggerNativeHaptics() {},
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/button/button_loading_icon", () => ({
  ButtonLoadingIcon: ({ children }) => children,
}));
const scope =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/overlay_portal_scope.web");
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/overlay_portal_scope",
  () => scope,
);
mock.module("@lodev09/react-native-true-sheet", () => ({
  TrueSheetProvider: ({ children }) => children,
}));
const modalScope =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/modal_content_scope.web");
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/modal_content_scope",
  () => modalScope,
);
// Native 桥与非本用例的控件不进入 Web 布局测试；列表和表单保留真实实现。
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/context_menu", () => ({
  ContextMenu: ({ trigger }) => trigger,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/dropdown", () => ({
  Dropdown: () => null,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/select", () => ({
  Select: () => null,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/switch", () => ({
  Switch: () => null,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/native_list/input_control", () => ({
  Input: RNW.TextInput,
}));
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/native_list/textarea_control",
  () => ({ Textarea: RNW.TextInput }),
);
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/scroll_view", () => ({
  ScrollView: RNW.ScrollView,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils", () => ({
  triggerNativeHaptics() {},
}));
mock.module("lucide-react-native", () =>
  Object.fromEntries(
    [
      "Check",
      "CheckCircle2",
      "ChevronRight",
      "Circle",
      "ChevronDown",
      "Folder",
      "FolderOpen",
      "FolderInput",
      "FolderSearch",
      "Info",
      "Pencil",
      "Trash2",
    ].map((name) => [name, () => <svg />]),
  ),
);
const { Button } = await import("../node_modules/rn-ui-kit/src/core/components/ui/button");
const { Dialog } = await import("../node_modules/rn-ui-kit/src/core/components/ui/dialog");
const { Text } = await import("../node_modules/rn-ui-kit/src/core/components/ui/text");
const { Tooltip } = await import("../node_modules/rn-ui-kit/src/core/components/ui/tooltip");
const basicList =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/native_list/native_list_basic");
mock.module("rn-ui-kit", () => ({
  ...basicList,
  Button,
  Dialog,
  Text,
  Tooltip,
  Select: () => null,
  Input: RNW.TextInput,
  Spinner: () => null,
  NativeSheetStack: () => null,
  getNativeStackScrollEdgeHeaderOptions: () => ({}),
  useAppBackgroundColors: () => ({ sheet: "#fff", header: "#fff" }),
  useUiTheme: () => theme,
}));

let layoutMode = "desktop";
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode }) }));
mock.module("../src/api/common", () => ({ isWeb: () => false, os: () => "windows" }));
// 弹窗容器已有独立回归；这里保留业务内容、真实列表及真实按钮。
mock.module("../src/components/common/adaptive_modal", () => ({
  AdaptiveModal: ({ children }) => <section aria-label="创建内容">{children}</section>,
}));
const { LanguageSettingsPage } =
  await import("../src/components/settings/pages/language_settings_page");
const { CreateWorkspaceEntrySheet } =
  await import("../src/components/workspaces/workspace_explorer/create_workspace_entry_sheet");
const { createRoot } = await import("react-dom/client");
let root;
async function render(content) {
  root ??= createRoot(document.body.appendChild(document.createElement("div")));
  await act(() => root.render(content));
}
function textElement(text) {
  return [...document.querySelectorAll("span")].find((item) => item.textContent === text);
}
function button(text) {
  return [...document.querySelectorAll("button")].find((item) => item.textContent === text);
}
afterEach(async () => {
  await act(() => root?.unmount());
  root = undefined;
  layoutMode = "desktop";
  document.body.replaceChildren();
});

// 若设置恢复默认行字号，语言标题/值会比同一桌面对话框的 13px 文本更大。
test("桌面设置标题和值采用同一紧凑字号且保留默认卡片", async () => {
  await render(
    <>
      <LanguageSettingsPage />
      <basicList.NativeList>
        <basicList.NativeListSection>
          <basicList.NativeListItem title="标准卡片" />
        </basicList.NativeListSection>
      </basicList.NativeList>
    </>,
  );
  expect(getComputedStyle(textElement("语言")).fontSize).toBe("13px");
  expect(getComputedStyle(textElement("简体中文")).fontSize).toBe("13px");
  expect(getComputedStyle(textElement("应用语言")).fontSize).toBe("12px");
  expect(getComputedStyle(textElement("当前版本仅提供简体中文。")).fontSize).toBe("12px");
  const surface = (text) => {
    let node = textElement(text);
    while (node) {
      const style = getComputedStyle(node);
      if (
        style.backgroundColor &&
        style.backgroundColor !== "transparent" &&
        style.backgroundColor !== "rgba(0, 0, 0, 0)"
      ) {
        return {
          background: style.backgroundColor,
          radius: style.borderRadius,
          shadow: style.boxShadow,
        };
      }
      node = node.parentElement;
    }
    throw new Error("未找到列表卡片背景");
  };
  expect(surface("语言")).toEqual(surface("标准卡片"));
});

test("移动设置保持真实 NativeList 的平台默认字号", async () => {
  layoutMode = "mobile";
  await render(
    <>
      <LanguageSettingsPage />
      <basicList.NativeList>
        <basicList.NativeListSection title="标准分组">
          <basicList.NativeListItem title="标准标题" value="标准值" />
        </basicList.NativeListSection>
      </basicList.NativeList>
    </>,
  );
  for (const [actual, standard] of [
    ["语言", "标准标题"],
    ["简体中文", "标准值"],
    ["应用语言", "标准分组"],
  ]) {
    expect(getComputedStyle(textElement(actual)).fontSize).toBe(
      getComputedStyle(textElement(standard)).fontSize,
    );
  }
});

for (const [entryKind, title] of [
  ["note", "创建笔记"],
  ["directory", "创建文件夹"],
]) {
  test("桌面" + title + "使用独立 footer，取消及创建生效且加载和空名称不可提交", async () => {
    let submissions = 0;
    const changes = [];
    const props = {
      entryKind,
      open: true,
      parentPath: "",
      name: "示例",
      isCreating: false,
      onNameChange() {},
      onOpenChange: (value) => changes.push(value),
      onSubmit: () => submissions++,
    };
    await render(<CreateWorkspaceEntrySheet {...props} />);
    const cancel = button("取消");
    const submit = button(title);
    expect(cancel).toBeTruthy();
    expect(submit).toBeTruthy();
    const footer = submit.parentElement;
    const form = footer.parentElement;
    const scroll = form.firstElementChild;
    expect(footer.contains(cancel)).toBe(true);
    expect(scroll.contains(submit)).toBe(false);
    expect(getComputedStyle(scroll).overflowY).toBe("auto");
    await act(() => cancel.click());
    await act(() => submit.click());
    expect(changes).toEqual([false]);
    expect(submissions).toBe(1);
    await render(<CreateWorkspaceEntrySheet {...props} name="   " />);
    expect(button(title).disabled).toBe(true);
    await render(<CreateWorkspaceEntrySheet {...props} isCreating />);
    expect(button("正在创建…").disabled).toBe(true);
    expect(button("取消").disabled).toBe(true);
    await act(() => button("正在创建…").click());
    expect(submissions).toBe(1);
  });

  test("移动" + title + "继续使用列表内提交行", async () => {
    layoutMode = "mobile";
    let submissions = 0;
    await render(
      <CreateWorkspaceEntrySheet
        entryKind={entryKind}
        open
        parentPath=""
        name="示例"
        isCreating={false}
        onNameChange={() => {}}
        onOpenChange={() => {}}
        onSubmit={() => submissions++}
      />,
    );
    expect(button("取消")).toBeUndefined();
    const submit = textElement(title)?.closest('[tabindex="0"]');
    expect(submit).toBeTruthy();
    let ancestor = submit.parentElement;
    while (ancestor && getComputedStyle(ancestor).overflowY !== "auto")
      ancestor = ancestor.parentElement;
    expect(ancestor).toBeTruthy();
    await act(() => submit.click());
    expect(submissions).toBe(1);
  });
}
