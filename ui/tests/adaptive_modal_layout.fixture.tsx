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
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode: "desktop" }) }));
mock.module("../src/api/common/platform", () => ({ isWeb: () => true }));
const { compareNames } = await import("../src/api/common/utils/name_sort_utils");
const { groupItemsByDate } = await import("../src/api/common/utils/date_group_utils");
mock.module("../src/api/common", () => ({
  isDesktop: () => true,
  isAndroid: () => false,
  compareNames,
  groupItemsByDate,
  formatUnixSecondsRelativeDate: () => "刚刚",
}));
mock.module("../src/api/commands/workspace", () => ({
  workspace: { nativeRootPath: async () => null },
  workspaceIndex: { getDirectory: async () => ({ path: "", entries: [] }) },
}));
const { AdaptiveModal } = await import("../src/components/common/adaptive_modal");
const { RenameWorkspaceEntrySheet } =
  await import("../src/components/workspaces/workspace_explorer/rename_workspace_entry_sheet");
const { DirectoryPickerHost } =
  await import("../src/components/workspaces/directory_picker/directory_picker_host");
const { workspaceDirectoryPicker, selectWorkspaceDirectory } =
  await import("../src/hooks/workspace/use_workspace_directory_picker");
const { workspaceSessionStore } = await import("../src/stores/workspace/workspace_session_store");
const { WorkspaceSelectList } =
  await import("../src/components/workspaces/workspace_select/workspace_select_list");
const { createRoot } = await import("react-dom/client");
let root;
async function render(content) {
  root ??= createRoot(document.body.appendChild(document.createElement("div")));
  await act(async () => root.render(content));
  await act(() => new Promise((resolve) => setTimeout(resolve, 40)));
}
afterEach(async () => {
  await act(() => {
    root?.unmount();
    workspaceDirectoryPicker.cancel();
  });
  root = undefined;
  document.body.replaceChildren();
});

// 若 CloseTrigger 失去独立层级，后续带背景的定位内容就能遮住它。
test("真实 Dialog 关闭按钮位于内容背景之上且能关闭", async () => {
  const changes = [];
  await render(
    <Dialog
      open
      onOpenChange={(value) => changes.push(value)}
      content={<RNW.View style={{ position: "relative", backgroundColor: "white", height: 300 }} />}
    />,
  );
  const close = document.querySelector('[aria-label="关闭"]');
  expect(Number(getComputedStyle(close).zIndex)).toBeGreaterThan(0);
  await act(() => close.click());
  expect(changes).toEqual([false]);
});

// 若 Body 恢复 block 或自身滚动，表单 flex 高度链中断，操作区会跟随滚动内容。
test("重命名 Dialog 将操作区固定在独立滚动表单下方", async () => {
  await render(
    <RenameWorkspaceEntrySheet
      open
      isRenaming={false}
      name="笔记.md"
      onNameChange={() => {}}
      onOpenChange={() => {}}
      onSubmit={() => {}}
    />,
  );
  const body = document.querySelector(".modal__body");
  expect(getComputedStyle(body).display).toBe("flex");
  expect(getComputedStyle(body).flexDirection).toBe("column");
  expect(body.style.overflow).toBe("hidden");
  expect(parseFloat(getComputedStyle(body).minHeight)).toBe(0);
  const form = body.firstElementChild;
  expect(getComputedStyle(form).flexGrow).toBe("1");
  const save = [...body.querySelectorAll("button")].find((button) => button.textContent === "保存");
  const footer = save.parentElement;
  expect(footer.parentElement).toBe(form);
  expect(getComputedStyle(footer).flexShrink).toBe("0");
  const scroll = form.firstElementChild;
  expect(getComputedStyle(scroll).overflowY).toBe("auto");
  expect(scroll.contains(save)).toBe(false);
  expect(getComputedStyle(scroll).flexGrow).toBe("1");
});

for (const purpose of ["move", "copy"]) {
  test(`${purpose} 目录选择树继承 Dialog 剩余高度并独立滚动`, async () => {
    workspaceSessionStore.setCurrentWorkspaceId("workspace");
    await render(<DirectoryPickerHost />);
    await act(() => {
      void selectWorkspaceDirectory({ workspaceId: "workspace", purpose });
    });
    const body = document.querySelector(".modal__body");
    expect(getComputedStyle(body).display).toBe("flex");
    expect(getComputedStyle(body).flexDirection).toBe("column");
    expect(body.style.overflow).toBe("hidden");
    const content = body.firstElementChild;
    expect(getComputedStyle(content).flexGrow).toBe("1");
    expect(getComputedStyle(content).minHeight).toBe("0px");
    const tree = [...content.children].find(
      (child) => getComputedStyle(child).overflowY === "auto",
    );
    expect(tree).toBeTruthy();
    expect(getComputedStyle(tree).flexGrow).toBe("1");
    expect(getComputedStyle(tree).minHeight).toBe("0px");
    expect(tree.querySelector('[aria-label="工作区根目录"]')).toBeTruthy();
    const confirm = [...content.querySelectorAll("button")].find(
      (button) => button.textContent === "确定",
    );
    expect(tree.contains(confirm)).toBe(false);
    expect(getComputedStyle(confirm.parentElement).flexShrink).toBe("0");
  });
}

test("AdaptiveModal 保留调用方的 Body 尺寸与可访问性设置", async () => {
  await render(
    <AdaptiveModal
      name="custom"
      open
      onOpenChange={() => {}}
      dialogBodyProps={{
        herouiWebProps: { "aria-label": "自定义内容", style: { paddingTop: 19 } },
      }}
    >
      <RNW.View />
    </AdaptiveModal>,
  );
  const body = document.querySelector('[aria-label="自定义内容"]');
  expect(body.style.paddingTop).toBe("19px");
  expect(getComputedStyle(body).display).toBe("flex");
});

test("工作区选择列表继承真实 NativeList 的默认卡片背景", async () => {
  const noop = () => {};
  await render(
    <>
      <basicList.NativeList>
        <basicList.NativeListSection>
          <basicList.NativeListNavigationItem title="标准工作区" onPress={noop} />
        </basicList.NativeListSection>
      </basicList.NativeList>
      <WorkspaceSelectList
        embedded
        hasError={false}
        groupMode="none"
        isDeletingWorkspace={false}
        isLoading={false}
        isOpeningWorkspace={false}
        isScanningWorkspaces={false}
        isUpdatingWorkspace={false}
        isWorkspaceSelectionMode={false}
        onCreateWorkspace={noop}
        onDeleteWorkspace={noop}
        onEditWorkspace={noop}
        onRelocateWorkspace={noop}
        onRebindWorkspace={noop}
        onWorkspaceDetails={noop}
        onRevealWorkspace={noop}
        onRefresh={async () => {}}
        onSelectedWorkspaceIdsChange={noop}
        onOpenInNewWindow={noop}
        onWorkspacePress={noop}
        selectedWorkspaceIds={[]}
        sortValue="modified-at-desc"
        tracksNavigationBarScrollEdge={false}
        usesNativeIosHeader={false}
        workspaces={[
          {
            id: "workspace",
            displayName: "示例工作区",
            isOpen: false,
            availability: "unknown",
            createdAt: 10,
            modifiedAt: 20,
            lastOpenedAt: 20,
            storageKind: "managed",
            storage: { kind: "managed", providerId: "app-local", directoryName: "workspace" },
          },
        ]}
      />
    </>,
  );
  const rowBackground = (title) => {
    let node = [...document.querySelectorAll("span")].find((item) => item.textContent === title);
    while (node) {
      const background = getComputedStyle(node).backgroundColor;
      if (
        background &&
        !/^rgba\(.*?,\s*0(?:\.0+)?\)$/.test(background) &&
        background !== "transparent"
      )
        return background;
      node = node.parentElement;
    }
    throw new Error(`未找到 ${title} 的卡片背景`);
  };
  expect(rowBackground("示例工作区")).toBe(rowBackground("标准工作区"));
});
