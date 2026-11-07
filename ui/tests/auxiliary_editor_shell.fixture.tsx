import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useEffect } from "react";

const win = new Window();
globalThis.window = win as any;
globalThis.document = win.document as any;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module("react-native", () => ({
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
  StyleSheet: { create: (styles: any) => styles, absoluteFillObject: {} },
}));
mock.module("rn-ui-kit", () => ({ Text: ({ children }: any) => <span>{children}</span> }));
const copiedDrafts: string[] = [];
let reconnects = 0;
let ownerDestroyed = false;
let freezes = 0;
let tabIds = ["tab"];
let emptyCloses = 0;
mock.module("../src/hooks/editor/use_editor_session", () => ({
  useEditorSession: () => ({ openEditorIds: tabIds }),
}));
mock.module("../src/api/commands/win/editor_windows", () => ({
  editorWindows: {
    closeCurrent: async () => {
      emptyCloses++;
      return true;
    },
  },
}));
mock.module("../src/api/commands/system/clipboard", () => ({
  clipboard: {
    writeText: async (text: string) => {
      copiedDrafts.push(text);
    },
  },
}));
mock.module("../src/components/editor/controllers/editor_window_service", () => ({
  editorWindowService: {
    getBootstrapSnapshot: () => ({
      role: "editor",
      windowLabel: "auxiliary",
      ownerWindowLabel: "owner",
      sessionId: "session",
      ownerEpoch: 3,
      ownerDestroyed,
    }),
    handleOwnerDestroyed: async () => {
      ownerDestroyed = true;
      connected = false;
      freezes++;
    },
    getRecoveryDraft: async () => "保留的草稿",
    retry: async () => {
      reconnects++;
    },
  },
}));
let connected = true;
mock.module("../src/hooks/editor/use_editor_windows", () => ({
  useEditorWindows: () => ({ role: "editor", ready: true, connected, error: null, ownerDestroyed }),
}));
let mounts = 0;
let unmounts = 0;
mock.module("../src/components/editor/desktop/desktop_editor_area", () => ({
  DesktopEditorArea: () => {
    useEffect(() => {
      mounts++;
      return () => {
        unmounts++;
      };
    }, []);
    return <iframe data-editor="retained" />;
  },
}));
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isTauri: () => true }));
mock.module("../src/hooks/ui", () => ({ useToast: () => ({ toast: { error() {} } }) }));
mock.module("../src/stores/editor", () => ({
  editorStore: { getState: () => ({ documentsById: {} }) },
}));
mock.module("../src/stores/workspace/workspace_catalog_revision", () => ({
  workspaceCatalogRevisionStore: { setState() {} },
}));
const prepared: string[] = [];
const finished: boolean[] = [];
mock.module("../src/hooks/editor/use_editor_close_actions", () => ({
  abortRemoteEditorWindowClose: async () => {},
  prepareCurrentWindowClose: ({ requestId }: { requestId: string }) => {
    prepared.push(requestId);
    return {
      ready: Promise.resolve(true),
      getError: () => null,
      finish: async (commit: boolean) => {
        finished.push(commit);
        return true;
      },
    };
  },
}));
const listeners = new Map<string, (event: any) => void>();
const stopped: string[] = [];
const invokes: { command: string; args: any }[] = [];
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (command: string, args: any) => {
    invokes.push({ command, args });
  },
}));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    label: "auxiliary",
    listen: async (event: string, callback: (event: any) => void) => {
      listeners.set(event, callback);
      return () => {
        stopped.push(event);
        listeners.delete(event);
      };
    },
    onFocusChanged: async () => () => {},
  }),
}));
const { createRoot } = await import("react-dom/client");
const { AuxiliaryEditorShell } = await import("../src/components/app_shell/auxiliary_editor_shell");
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("辅助窗口挂载关闭协议，核验目标身份并在断联时保留编辑surface", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<AuxiliaryEditorShell />);
      await settle();
    });
    const close = listeners.get("lonanote://window-close");
    expect(close).toBeDefined();
    close!({ payload: { windowLabel: "other", requestId: "wrong", stage: "prepare" } });
    await settle();
    expect(prepared).toEqual([]);
    close!({ payload: { windowLabel: "auxiliary", requestId: "close", stage: "prepare" } });
    await settle();
    expect(prepared).toEqual(["close"]);
    expect(
      invokes.some(
        ({ command, args }) =>
          command === "respond_window_close" && args.requestId === "close" && args.accepted,
      ),
    ).toBe(true);
    close!({ payload: { windowLabel: "auxiliary", requestId: "close", stage: "abort" } });
    await settle();
    expect(finished).toEqual([false]);
    const surface = container.querySelector("iframe");
    connected = false;
    await act(() => root.render(<AuxiliaryEditorShell />));
    expect(container.textContent).toContain("草稿已保留");
    expect(container.querySelector("iframe")).toBe(surface);
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
    const buttons = [...container.querySelectorAll("button")];
    await act(async () => {
      buttons.find((button) => button.textContent === "复制保留的草稿")!.click();
      await settle();
    });
    expect(copiedDrafts).toEqual(["保留的草稿"]);
    await act(async () => {
      buttons.find((button) => button.textContent === "重新连接")!.click();
      await settle();
    });
    expect(reconnects).toBe(1);
    expect(container.querySelector("iframe")).toBe(surface);
    const ownerLost = listeners.get("lonanote://editor-window-owner-destroyed");
    expect(ownerLost).toBeDefined();
    ownerLost!({
      payload: {
        windowLabel: "auxiliary",
        ownerWindowLabel: "owner",
        sessionId: "session",
        ownerEpoch: 2,
        requestId: null,
      },
    });
    await settle();
    expect(freezes).toBe(0);
    await act(async () => {
      ownerLost!({
        payload: {
          windowLabel: "auxiliary",
          ownerWindowLabel: "owner",
          sessionId: "session",
          ownerEpoch: 3,
          requestId: null,
        },
      });
      await settle();
      root.render(<AuxiliaryEditorShell />);
    });
    expect(freezes).toBe(1);
    expect(container.querySelector("iframe")).toBe(surface);
    expect(unmounts).toBe(0);
    expect(container.textContent).toContain("原窗口已意外关闭");
    expect(
      [...container.querySelectorAll("button")].some((button) => button.textContent === "重新连接"),
    ).toBe(false);
    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "复制保留的草稿")!
        .click();
      await settle();
    });
    expect(copiedDrafts).toEqual(["保留的草稿", "保留的草稿"]);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
  expect(stopped).toContain("lonanote://window-close");
  expect(unmounts).toBe(1);
});

test("最后一个标签关闭或移走后关闭辅助窗口，初始空状态不误关", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  tabIds = [];
  await act(async () => {
    root.render(<AuxiliaryEditorShell />);
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  expect(emptyCloses).toBe(0);
  tabIds = ["moved-tab"];
  await act(async () => {
    root.render(<AuxiliaryEditorShell />);
  });
  tabIds = [];
  await act(async () => {
    root.render(<AuxiliaryEditorShell />);
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  expect(emptyCloses).toBe(1);
  await act(() => root.unmount());
});
