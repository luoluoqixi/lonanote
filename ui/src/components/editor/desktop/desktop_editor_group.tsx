import { FilePlus2, FolderOpen } from "lucide-react-native";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "rn-ui-kit";
import { Button, useUiTheme } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { clipboard } from "@/api/commands/system/clipboard";
import {
  type ExternalFileDropEvent,
  listenExternalFileDrop,
} from "@/api/commands/win/external_file_drop_events";
import { createAsyncSubscription } from "@/api/common/async_subscription";
import { isDesktop, isWeb } from "@/api/common/platform";
import {
  documentRegistry,
  editorCommandCoordinator,
  editorInputLeaseCoordinator,
} from "@/components/editor/controllers";
import { editorWindowRuntime } from "@/components/editor/controllers/editor_window_runtime";
// 创建窗口依赖提前加载，避免 Metro 在首次菜单操作时注册动态 bundle 并因 HMR 失联重载页面。
import {
  editorWindowService,
  transferEditorToNewWindow,
} from "@/components/editor/controllers/editor_window_service";
import { createUntitledDocumentForWindow } from "@/components/editor/controllers/untitled_documents";
import { WorkspaceFilePreview } from "@/components/files/workspace_file_preview";
import { RecentWorkspaces } from "@/components/workspaces/recent_workspaces";
import { useEditorSession } from "@/hooks/editor";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useEditorFileActions } from "@/hooks/editor/use_editor_file_actions";
import { useLayoutMode } from "@/hooks/layout";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId } from "@/hooks/workspace";
import { editorStore, isDocumentDirty } from "@/stores/editor";

import { DesktopEditorActions } from "./desktop_editor_actions";
import { DesktopEditorTab } from "./desktop_editor_tab";
import { EditorEmptyInput } from "./editor_empty_input";
import { isEditorFileDropInside } from "./editor_file_drop";
import { getEditorGroupAtPoint } from "./editor_group_hit";
import { EditorTabBlankInput } from "./editor_tab_blank_input";
import { EditorTabDragInput } from "./editor_tab_drag_input";
import { EditorTabDropTarget } from "./editor_tab_drop_target";
import { EditorTabInput } from "./editor_tab_input";
import {
  type EditorTabCloseAction,
  getEditorTabCloseTargets,
  getEditorTabRef,
} from "./editor_tab_menu_actions";
import { type EditorTabMenuItem, toEditorTabContextMenuItems } from "./editor_tab_menu_items";
import { getEditorTabScrollTarget } from "./editor_tab_scroll";
import { EditorTabScrollFeedback } from "./editor_tab_scroll_feedback";
import { EditorWorkspaceFileDrop } from "./editor_workspace_file_drop";
import { useEditorTabDrag } from "./use_editor_tab_drag";

// 以编辑区的逻辑宽度判断；优先缩短路径，足够窄时才切换为上下布局。
const WELCOME_STACK_WIDTH = 480;

export function DesktopEditorGroup({
  onRevealInExplorer,
  groupId,
}: {
  groupId: string;
  onRevealInExplorer?: (workspaceId: string, path: string) => Promise<void>;
}) {
  const theme = useUiTheme();
  const { layoutMode } = useLayoutMode();
  const [emptyWidth, setEmptyWidth] = useState(0);
  const { getSnapshot, documentsById, editorsById, viewersById, setActiveEditor, moveEditor } =
    useEditorSession();
  const snapshot = getSnapshot();
  const group = snapshot.groupsById[groupId];
  const openEditorIds = group?.tabIds ?? [];
  const activeEditorId = group?.activeTabId ?? null;
  const focused = snapshot.activeGroupId === groupId;
  const { closeEditors } = useEditorCloseActions();
  const { toast } = useToast();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { openLooseFile } = useEditorFileActions();
  const editorAreaRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const tabBounds = useRef(new Map<string, { x: number; width: number }>());
  const scrollPosition = useRef(0);
  const viewportWidth = useRef(0);
  const tabViewportRef = useRef<View>(null);
  const tabContentWidth = useRef(0);
  const tabNodes = useRef(new Map<string, View>());
  const tabDrag = useEditorTabDrag({
    ids: openEditorIds,
    bounds: tabBounds,
    viewportRef: tabViewportRef,
    scrollRef,
    scrollPosition,
    contentWidth: tabContentWidth,
    tabNodes,
    moveEditor,
    dropInGroup: (id, x, y) => {
      const target = getEditorGroupAtPoint(x, y);
      if (!target || target === groupId) return false;
      void import("../controllers/editor_window_service")
        .then(({ editorWindowService }) => editorWindowService.moveTabToGroup(id, target))
        .catch(console.error);
      return true;
    },
  });
  useEffect(() => {
    for (const id of tabBounds.current.keys()) {
      if (!openEditorIds.includes(id)) tabBounds.current.delete(id);
    }
  }, [openEditorIds]);
  const activeTabId = useRef(activeEditorId);
  activeTabId.current = activeEditorId;
  const revealFrame = useRef<number | null>(null);
  const revealActiveTab = useCallback(() => {
    if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    revealFrame.current = requestAnimationFrame(() => {
      revealFrame.current = null;
      const id = activeTabId.current;
      if (!id) return;
      let bounds = tabBounds.current.get(id);
      let left = scrollPosition.current;
      let width = viewportWidth.current;
      if (isWeb()) {
        // Web 的布局与 scroll 事件异步到达；直接使用同一帧的实际几何数据。
        const viewport = scrollRef.current?.getScrollableNode() as HTMLElement | undefined;
        const tab = tabNodes.current.get(id) as unknown as HTMLElement | undefined;
        if (!viewport || !tab) return;
        const tabRect = tab.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        left = viewport.scrollLeft;
        width = viewport.clientWidth;
        bounds = { x: left + tabRect.left - viewportRect.left, width: tabRect.width };
      }
      if (!bounds) return;
      const target = getEditorTabScrollTarget(bounds, left, width);
      if (target !== null) {
        scrollPosition.current = target;
        scrollRef.current?.scrollTo({ x: target, animated: false });
      }
    });
  }, []);
  useEffect(() => {
    revealActiveTab();
    return () => {
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    };
  }, [activeEditorId, revealActiveTab]);
  const activeViewer = activeEditorId ? viewersById[activeEditorId] : null;
  const activeEditor = activeEditorId ? editorsById[activeEditorId] : null;
  const activeDocument = activeEditor ? documentsById[activeEditor.documentId] : null;
  const tabs = useMemo(
    () =>
      openEditorIds.flatMap((id) => {
        const viewer = viewersById[id];
        if (viewer) return [{ id, title: viewer.title, dirty: false }];
        const editor = editorsById[id];
        const document = editor ? documentsById[editor.documentId] : null;
        return document ? [{ id, title: document.title, dirty: isDocumentDirty(document) }] : [];
      }),
    [openEditorIds, viewersById, editorsById, documentsById],
  );
  const remote = editorWindowRuntime.isRemote();
  const canOpenLooseFile = isDesktop() && !remote;

  const activateEditor = useCallback(
    (editorId: string) => {
      setActiveEditor(editorId);
      if (editorWindowRuntime.isRemote()) {
        void import("@/components/editor/controllers/editor_window_service")
          .then(({ editorWindowService }) => editorWindowService.requestLease(editorId))
          .then(() => editorCommandCoordinator.focusIfActive(editorId))
          .catch(() => undefined);
      } else
        void editorInputLeaseCoordinator
          .requestLease(editorId)
          .then(() => editorCommandCoordinator.focusIfActive(editorId))
          .catch(() => undefined);
    },
    [setActiveEditor],
  );

  useEffect(() => {
    if (!activeEditor || !activeDocument || remote) return;
    void documentRegistry.ensureDocumentLoaded(activeDocument.documentId).catch(() => undefined);
    if (focused)
      void editorInputLeaseCoordinator.requestLease(activeEditor.editorId).catch(() => undefined);
  }, [
    activeDocument?.documentId,
    activeDocument?.identityRevision,
    activeEditor?.editorId,
    focused,
    remote,
  ]);

  const reportError = useCallback(
    (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "标签页操作失败");
    },
    [toast],
  );
  const requestClose = useCallback(
    (id: string, action: EditorTabCloseAction = "close") => {
      const targets = getEditorTabCloseTargets(action, id, getSnapshot());
      return closeEditors(targets, { savedOnly: action === "closeSaved" });
    },
    [closeEditors, getSnapshot],
  );

  const getTabMenuItems = useCallback(
    (id: string, nativePath: string | null) => {
      const initial = getSnapshot();
      const ref = getEditorTabRef(id, initial);
      if (!ref) return [];
      const identity = JSON.stringify(ref);
      const isCurrent = () =>
        getSnapshot().openEditorIds.includes(id) &&
        JSON.stringify(getEditorTabRef(id, getSnapshot())) === identity;
      const items: EditorTabMenuItem[] = [
        { action: "close", text: "关闭", enabled: true },
        {
          action: "closeOthers",
          text: "关闭其他",
          enabled: getEditorTabCloseTargets("closeOthers", id, initial).length > 0,
        },
        {
          action: "closeRight",
          text: "关闭右侧标签页",
          enabled: getEditorTabCloseTargets("closeRight", id, initial).length > 0,
        },
        {
          action: "closeSaved",
          text: "关闭已保存",
          enabled: getEditorTabCloseTargets("closeSaved", id, initial).length > 0,
        },
        { action: "closeAll", text: "全部关闭", enabled: true },
        ...(layoutMode === "desktop"
          ? [
              {
                action: "splitRight" as const,
                text: "向右拆分",
                enabled: true,
                separatorBefore: true,
              },
              { action: "splitDown" as const, text: "向下拆分", enabled: true },
              { action: "splitLeft" as const, text: "向左拆分", enabled: true },
              { action: "splitUp" as const, text: "向上拆分", enabled: true },
            ]
          : []),
        ...(isDesktop() && layoutMode === "desktop"
          ? [
              {
                action: "moveToNewWindow" as const,
                text: "移动到新窗口",
                enabled: !!initial.editorsById[id] || !!initial.viewersById[id],
                separatorBefore: true,
              },
              {
                action: "copyToNewWindow" as const,
                text: "复制到新窗口",
                enabled: !!initial.editorsById[id] || !!initial.viewersById[id],
              },
            ]
          : []),
        { action: "copyPath", text: "复制路径", enabled: !!nativePath, separatorBefore: true },
        { action: "copyRelativePath", text: "复制相对路径", enabled: ref.kind !== "untitled" },
        {
          action: "revealFile",
          text: "在文件管理器中显示",
          enabled: !!nativePath && isDesktop(),
          separatorBefore: true,
        },
        {
          action: "revealExplorer",
          text: "在资源管理器视图中显示",
          enabled:
            ref.kind === "workspaceFile" &&
            ref.workspaceId === currentWorkspaceId &&
            !!onRevealInExplorer,
        },
      ];
      const execute = async (action: EditorTabMenuItem["action"]) => {
        if (
          action === "splitRight" ||
          action === "splitDown" ||
          action === "splitLeft" ||
          action === "splitUp"
        ) {
          const direction = action === "splitRight" || action === "splitLeft" ? "row" : "column";
          const placement = action === "splitLeft" || action === "splitUp" ? "before" : "after";
          if (remote) {
            await editorWindowService.splitRemoteEditor(id, direction, placement);
          } else editorStore.getState().splitEditor(id, direction, placement);
        } else if (action === "moveToNewWindow" || action === "copyToNewWindow") {
          await transferEditorToNewWindow(id, action === "moveToNewWindow" ? "move" : "copy");
        } else if (action === "copyPath") {
          if (nativePath) await clipboard.writeText(nativePath);
        } else if (action === "copyRelativePath") {
          if (ref.kind !== "untitled")
            await clipboard.writeText(
              ref.kind === "workspaceFile" ? ref.filePath : ref.absolutePath,
            );
        } else if (action === "revealFile") {
          if (nativePath) await fs.showInFolder(nativePath);
        } else if (action === "revealExplorer") {
          if (ref.kind === "workspaceFile" && ref.workspaceId === currentWorkspaceId)
            await onRevealInExplorer?.(ref.workspaceId, ref.filePath);
        } else {
          await requestClose(id, action);
        }
      };
      return toEditorTabContextMenuItems(items, isCurrent, execute, reportError);
    },
    [
      currentWorkspaceId,
      getSnapshot,
      onRevealInExplorer,
      remote,
      reportError,
      requestClose,
      layoutMode,
    ],
  );

  const reportDropError = useEffectEvent((error: unknown) => reportError(error));

  useEffect(() => {
    if (!isDesktop()) return;
    let disposed = false;
    const accept = (payload: ExternalFileDropEvent) => {
      if (disposed) return;
      const area = editorAreaRef.current as unknown as HTMLElement | null;
      if (
        !area ||
        !isEditorFileDropInside(
          payload,
          area.getBoundingClientRect(),
          payload.physical ? window.devicePixelRatio || 1 : 1,
        )
      )
        return;
      if (payload.error) {
        reportDropError(new Error(payload.error));
        return;
      }
      if (payload.token)
        void editorWindowService.dropExternalFiles(payload.token, groupId).catch(reportDropError);
    };
    const onError = (event: Event) => accept((event as CustomEvent<ExternalFileDropEvent>).detail);
    window.addEventListener("lonanote:external-file-drop", onError);
    const cleanup = createAsyncSubscription(
      () => listenExternalFileDrop(accept),
      (error) => {
        console.warn("[editor] 文件拖放监听操作失败", error);
      },
    );
    return () => {
      disposed = true;
      window.removeEventListener("lonanote:external-file-drop", onError);
      cleanup();
    };
  }, [groupId]);

  return (
    <View
      nativeID={`desktop-editor-group-${groupId}`}
      ref={editorAreaRef}
      onTouchStart={() => editorStore.getState().setActiveGroup(groupId)}
      onPointerDown={() => editorStore.getState().setActiveGroup(groupId)}
      style={[styles.root, { backgroundColor: theme.background }]}
    >
      <EditorWorkspaceFileDrop groupId={groupId} onError={reportError} />
      <View
        style={[styles.tabs, { borderBottomColor: tabs.length > 0 ? theme.border : "transparent" }]}
      >
        <View ref={tabViewportRef} style={styles.tabScroller}>
          <EditorTabDropTarget groupId={groupId} onError={reportError}>
            <ScrollView
              ref={scrollRef}
              horizontal
              scrollEnabled={!tabDrag.preview}
              onContentSizeChange={(width) => {
                tabContentWidth.current = width;
              }}
              showsHorizontalScrollIndicator={false}
              style={styles.tabList}
              contentContainerStyle={{ alignItems: "stretch", flexGrow: 1 }}
              onLayout={(event) => {
                viewportWidth.current = event.nativeEvent.layout.width;
                revealActiveTab();
              }}
              onScroll={(event) => {
                scrollPosition.current = event.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={16}
            >
              {tabs.map(({ id, title, dirty }) => (
                <EditorTabDragInput
                  key={id}
                  editorId={id}
                  enabled={true}
                  dragging={tabDrag.preview?.id === id}
                  onStart={(x, y) => tabDrag.start(id, title, x, y)}
                  onMove={tabDrag.move}
                  onFinish={tabDrag.finish}
                  viewRef={(node) => {
                    if (node) tabNodes.current.set(id, node);
                    else {
                      tabNodes.current.delete(id);
                    }
                  }}
                  onLayout={(event) => {
                    tabBounds.current.set(id, event.nativeEvent.layout);
                    if (!tabDrag.isSuppressingPress()) revealActiveTab();
                  }}
                >
                  <EditorTabInput
                    documentRef={getEditorTabRef(id, getSnapshot())}
                    getItems={(nativePath) => getTabMenuItems(id, nativePath)}
                    suppressTooltip={tabDrag.preview !== null}
                  >
                    <DesktopEditorTab
                      active={id === activeEditorId}
                      groupFocused={focused}
                      dirty={dirty}
                      title={title}
                      onActivate={() => {
                        if (!tabDrag.isSuppressingPress()) activateEditor(id);
                      }}
                      onClose={() => {
                        if (tabDrag.isSuppressingPress()) return;
                        void requestClose(id).catch(reportError);
                      }}
                    />
                  </EditorTabInput>
                </EditorTabDragInput>
              ))}
              <EditorTabBlankInput
                key={currentWorkspaceId ?? "no-workspace"}
                disabled={false}
                onCreateNote={() => {
                  void createUntitledDocumentForWindow(groupId).catch(reportError);
                }}
              />
            </ScrollView>
          </EditorTabDropTarget>
          {tabDrag.preview ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <View
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  left: tabDrag.preview.marker,
                  width: 2,
                  backgroundColor: theme.primary,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: tabDrag.preview.left,
                  top: 3,
                  height: 30,
                  maxWidth: 220,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  backgroundColor: theme.secondary,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 4,
                  opacity: 0.9,
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 13, color: theme.foreground }}>
                  {tabDrag.preview.title}
                </Text>
              </View>
            </View>
          ) : null}
          <EditorTabScrollFeedback scrollRef={scrollRef} />
        </View>
        {activeEditorId ? (
          <DesktopEditorActions
            key={activeEditorId}
            editorId={activeEditorId}
            onRevealInExplorer={onRevealInExplorer}
          />
        ) : null}
      </View>
      <View style={styles.viewport}>
        {activeViewer ? (
          <View style={[styles.foregroundSurface, { backgroundColor: theme.background }]}>
            <WorkspaceFilePreview
              key={`${activeViewer.viewerId}:${activeViewer.identityRevision}`}
              viewer={activeViewer}
            />
          </View>
        ) : !activeEditor ? (
          <View
            style={[
              styles.emptyState,
              styles.foregroundSurface,
              { backgroundColor: theme.background },
            ]}
          >
            <EditorEmptyInput
              key={currentWorkspaceId ?? "no-workspace"}
              disabled={tabs.length > 0}
              onCreateNote={() => {
                void createUntitledDocumentForWindow(groupId).catch(reportError);
              }}
            >
              <ScrollView
                style={{ width: "100%" }}
                contentContainerStyle={styles.welcomeScroll}
                onLayout={(event) => setEmptyWidth(event.nativeEvent.layout.width)}
              >
                <View
                  style={[
                    styles.welcome,
                    { flexDirection: emptyWidth >= WELCOME_STACK_WIDTH ? "row" : "column" },
                  ]}
                >
                  <View
                    style={[
                      styles.welcomeActions,
                      currentWorkspaceId || openEditorIds.length > 0
                        ? { alignSelf: "center" }
                        : null,
                    ]}
                  >
                    <Text
                      style={{ color: theme.mutedForeground, fontSize: 13, alignSelf: "center" }}
                    >
                      尚未打开文档
                    </Text>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        void createUntitledDocumentForWindow(groupId).catch(reportError);
                      }}
                    >
                      <FilePlus2 size={16} color={theme.mutedForeground} />
                      新建笔记
                    </Button>
                    {canOpenLooseFile ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          editorStore.getState().setActiveGroup(groupId);
                          void openLooseFile();
                        }}
                      >
                        <FolderOpen size={16} color={theme.mutedForeground} />
                        打开文件
                      </Button>
                    ) : null}
                  </View>
                  {!remote && !currentWorkspaceId && openEditorIds.length === 0 ? (
                    <RecentWorkspaces />
                  ) : null}
                </View>
              </ScrollView>
            </EditorEmptyInput>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  welcome: {
    width: "100%",
    maxWidth: 900,
    justifyContent: "center",
    alignItems: "stretch",
    gap: 24,
  },
  welcomeActions: {
    alignItems: "flex-start",
    gap: 8,
    flexShrink: 0,
  },
  viewport: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  foregroundSurface: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  loadingStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  tabList: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  tabScroller: {
    flex: 1,
    minWidth: 0,
    height: 36,
    position: "relative",
    overflow: "hidden",
  },
  tabs: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 37,
  },
});
