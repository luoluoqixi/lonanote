import { FilePlus2, FolderOpen } from "lucide-react-native";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Spinner, useUiTheme } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { clipboard } from "@/api/commands/system/clipboard";
import { workspaceIndex } from "@/api/commands/workspace";
import { createAsyncSubscription } from "@/api/common/async_subscription";
import { isDesktop, isWeb } from "@/api/common/platform";
import { getAvailableEntryName } from "@/api/common/utils/workspace_entry_name";
import { documentRegistry, editorInputLeaseCoordinator } from "@/components/editor/controllers";
import { EditorToolbar } from "@/components/editor/editor_toolbar";
import { EditorWebView } from "@/components/editor/editor_webview";
import { WorkspaceFilePreview } from "@/components/files/workspace_file_preview";
import { useEditorSession } from "@/hooks/editor";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId } from "@/hooks/workspace";
import { useWorkspaceFileActions } from "@/hooks/workspace/use_workspace_file_actions";
import { isDocumentDirty } from "@/stores/editor";

import { DesktopEditorActions } from "./desktop_editor_actions";
import { DesktopEditorSurface } from "./desktop_editor_surface";
import { DesktopEditorTab } from "./desktop_editor_tab";
import { EDITOR_FILE_EXTENSIONS, getEditorDroppedFiles } from "./editor_file_drop";
import { EditorTabBlankInput } from "./editor_tab_blank_input";
import { EditorTabInput } from "./editor_tab_input";
import {
  type EditorTabCloseAction,
  getEditorTabCloseTargets,
  getEditorTabRef,
} from "./editor_tab_menu_actions";
import { type EditorTabMenuItem, toEditorTabContextMenuItems } from "./editor_tab_menu_items";
import { getEditorTabScrollTarget } from "./editor_tab_scroll";
import { EditorTabScrollFeedback } from "./editor_tab_scroll_feedback";

export function DesktopEditorArea({
  onRevealInExplorer,
}: {
  onRevealInExplorer?: (workspaceId: string, path: string) => Promise<void>;
}) {
  const theme = useUiTheme();
  const {
    activeEditorId,
    getSnapshot,
    documentsById,
    editorsById,
    openEditorIds,
    viewersById,
    setActiveEditor,
  } = useEditorSession();
  const { closeEditors } = useEditorCloseActions();
  const { toast } = useToast();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const fileActions = useWorkspaceFileActions();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const isCreatingNoteRef = useRef(false);
  const editorAreaRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const tabBounds = useRef(new Map<string, { x: number; width: number }>());
  const scrollPosition = useRef(0);
  const viewportWidth = useRef(0);
  const tabNodes = useRef(new Map<string, View>());
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
  const canOpenLooseFile = isDesktop();

  const activateEditor = useCallback(
    (editorId: string) => {
      setActiveEditor(editorId);
      void editorInputLeaseCoordinator.requestLease(editorId).catch(() => undefined);
    },
    [setActiveEditor],
  );

  useEffect(() => {
    if (!activeEditor || !activeDocument) return;
    void documentRegistry.ensureDocumentLoaded(activeDocument.documentId).catch(() => undefined);
    void editorInputLeaseCoordinator.requestLease(activeEditor.editorId).catch(() => undefined);
  }, [activeDocument?.documentId, activeDocument?.identityRevision, activeEditor?.editorId]);

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
        { action: "closeOthers", text: "关闭其他", enabled: initial.openEditorIds.length > 1 },
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
        if (action === "copyPath") {
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
    [currentWorkspaceId, getSnapshot, onRevealInExplorer, reportError, requestClose],
  );

  const createNote = useCallback(async () => {
    if (!currentWorkspaceId || isCreatingNoteRef.current) return;
    isCreatingNoteRef.current = true;
    setIsCreatingNote(true);
    try {
      const { entries } = await workspaceIndex.getDirectory(currentWorkspaceId, "");
      const name = getAvailableEntryName(entries, "未命名笔记", ".md");
      const result = await fileActions.createEntry({
        workspaceId: currentWorkspaceId,
        parentPath: "",
        name,
        kind: "note",
      });
      const filePath = result.succeededPaths[0];
      if (!filePath) return;
      documentRegistry.openEditor({
        kind: "workspaceFile",
        workspaceId: currentWorkspaceId,
        filePath,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建笔记失败");
    } finally {
      isCreatingNoteRef.current = false;
      setIsCreatingNote(false);
    }
  }, [currentWorkspaceId, fileActions, toast]);

  const openLooseFilePath = useCallback((absolutePath: string) => {
    documentRegistry.openEditor({ kind: "looseFile", absolutePath });
  }, []);

  const reportDropError = useEffectEvent((error: unknown) => reportError(error));

  useEffect(() => {
    if (!isDesktop()) return;
    let disposed = false;
    const cleanup = createAsyncSubscription(
      async () => {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        // 只监听实际落下事件，直接保留可等待的 unlisten，避免组合 API 丢弃清理 Promise。
        return getCurrentWebview().listen<{ paths: string[]; position: { x: number; y: number } }>(
          "tauri://drag-drop",
          ({ payload }) => {
            if (disposed) return;
            const area = editorAreaRef.current as unknown as HTMLElement | null;
            if (!area) return;
            const paths = getEditorDroppedFiles(
              payload.paths,
              payload.position,
              area.getBoundingClientRect(),
              window.devicePixelRatio || 1,
            );
            for (const path of paths) {
              try {
                openLooseFilePath(path);
              } catch (error) {
                reportDropError(error);
              }
            }
          },
        );
      },
      (error) => {
        console.warn("[editor] 文件拖放监听操作失败", error);
      },
    );
    return () => {
      disposed = true;
      cleanup();
    };
  }, [openLooseFilePath]);

  const openLooseFile = useCallback(async () => {
    try {
      const result = await fs.showSelectDialog({
        type: "openFile",
        title: "打开 Markdown 文件",
        filters: [{ name: "Markdown", extensions: EDITOR_FILE_EXTENSIONS }],
      });
      if (result?.path) {
        openLooseFilePath(result.path);
      }
    } catch (error) {
      console.warn("[editor] 打开 loose file 失败", error);
    }
  }, [openLooseFilePath]);

  return (
    <View ref={editorAreaRef} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        <View style={styles.tabScroller}>
          <ScrollView
            ref={scrollRef}
            horizontal
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
              <EditorTabInput
                key={id}
                documentRef={getEditorTabRef(id, getSnapshot())}
                getItems={(nativePath) => getTabMenuItems(id, nativePath)}
                viewRef={(node) => {
                  if (node) tabNodes.current.set(id, node);
                  else {
                    tabNodes.current.delete(id);
                    tabBounds.current.delete(id);
                  }
                }}
                onLayout={(event) => {
                  tabBounds.current.set(id, event.nativeEvent.layout);
                  revealActiveTab();
                }}
              >
                <DesktopEditorTab
                  active={id === activeEditorId}
                  dirty={dirty}
                  title={title}
                  onActivate={() => activateEditor(id)}
                  onClose={() => {
                    void requestClose(id).catch(reportError);
                  }}
                />
              </EditorTabInput>
            ))}
            <EditorTabBlankInput
              key={currentWorkspaceId ?? "no-workspace"}
              disabled={!currentWorkspaceId || isCreatingNote}
              onCreateNote={() => void createNote()}
            />
          </ScrollView>
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
        {openEditorIds.map((id) => {
          const view = editorsById[id];
          const document = view ? documentsById[view.documentId] : null;
          if (!view || !document) return null;
          return (
            <DesktopEditorSurface
              key={id}
              active={activeEditorId === id}
              backgroundColor={theme.background}
            >
              {document.loadState === "ready" ? (
                <EditorWebView active={activeEditorId === id} document={document} editor={view} />
              ) : (
                <View style={styles.emptyState}>
                  {document.loadState === "error" ? (
                    <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
                      {document.loadError ?? "读取文档失败"}
                    </Text>
                  ) : (
                    <View style={styles.loadingStatus}>
                      <Spinner size="sm" />
                      <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
                        正在打开文档
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {!isDesktop() && activeEditorId === id ? (
                <EditorToolbar document={document} editor={view} />
              ) : null}
            </DesktopEditorSurface>
          );
        })}
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
            <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>尚未打开文档</Text>
            <Button
              size="sm"
              variant="ghost"
              disabled={!currentWorkspaceId || isCreatingNote}
              onPress={() => void createNote()}
            >
              <FilePlus2 size={16} color={theme.mutedForeground} />
              新建笔记
            </Button>
            {canOpenLooseFile ? (
              <Button size="sm" variant="ghost" onPress={() => void openLooseFile()}>
                <FolderOpen size={16} color={theme.mutedForeground} />
                打开文件
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
