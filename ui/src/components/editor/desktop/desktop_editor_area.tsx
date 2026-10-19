import { FilePlus2, FolderOpen } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertDialog, Button, useUiTheme } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { isDesktop, isWeb } from "@/api/common/platform";
import {
  documentRegistry,
  editorInputLeaseCoordinator,
  saveCoordinator,
} from "@/components/editor/controllers";
import { EditorToolbar } from "@/components/editor/editor_toolbar";
import { EditorWebView } from "@/components/editor/editor_webview";
import { WorkspaceFilePreview } from "@/components/files/workspace_file_preview";
import { useEditorSession } from "@/hooks/editor";
import { isDocumentDirty } from "@/stores/editor";

import { DesktopEditorTab } from "./desktop_editor_tab";
import { getEditorTabScrollTarget } from "./editor_tab_scroll";

export function DesktopEditorArea() {
  const theme = useUiTheme();
  const {
    activeEditorId,
    closeEditor,
    getDocument,
    discardDocumentDraft,
    documentsById,
    editorsById,
    openEditorIds,
    viewersById,
    setActiveEditor,
  } = useEditorSession();
  const [closeTargetEditorId, setCloseTargetEditorId] = useState<string | null>(null);
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  const [closeSaveError, setCloseSaveError] = useState<string | null>(null);
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
  const closeTarget = closeTargetEditorId ? editorsById[closeTargetEditorId] : null;
  const closeTargetDocument = closeTarget ? documentsById[closeTarget.documentId] : null;
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

  const closeImmediately = useCallback(
    (editorId: string) => {
      closeEditor(editorId);
      setCloseTargetEditorId(null);
      setCloseSaveError(null);
    },
    [closeEditor],
  );

  const requestClose = useCallback(
    (editorId: string) => {
      const editor = editorsById[editorId];
      const document = editor ? documentsById[editor.documentId] : null;
      if (viewersById[editorId]) {
        closeImmediately(editorId);
        return;
      }
      if (!editor || !document) return;
      if (isDocumentDirty(document) && document.attachedEditorIds.length === 1) {
        setCloseSaveError(null);
        setCloseTargetEditorId(editorId);
        return;
      }
      closeImmediately(editorId);
    },
    [closeImmediately, documentsById, editorsById, viewersById],
  );

  const saveBeforeClose = useCallback(async () => {
    if (!closeTarget || !closeTargetDocument) return;
    setIsSavingBeforeClose(true);
    setCloseSaveError(null);
    try {
      await saveCoordinator.flushDocument(closeTargetDocument.documentId);
      const latestDocument = getDocument(closeTargetDocument.documentId);
      if (!latestDocument || isDocumentDirty(latestDocument)) {
        throw new Error("保存期间出现新的编辑，请再次保存后关闭");
      }
      closeImmediately(closeTarget.editorId);
    } catch (error) {
      setCloseSaveError(error instanceof Error ? error.message : "保存文档失败");
    } finally {
      setIsSavingBeforeClose(false);
    }
  }, [closeImmediately, closeTarget, closeTargetDocument, getDocument]);

  const discardBeforeClose = useCallback(() => {
    if (!closeTarget || !closeTargetDocument) return;
    saveCoordinator.cancelAutoSave(closeTargetDocument.documentId);
    discardDocumentDraft(closeTargetDocument.documentId);
    closeImmediately(closeTarget.editorId);
  }, [closeImmediately, closeTarget, closeTargetDocument, discardDocumentDraft]);

  const openLooseFile = useCallback(async () => {
    try {
      const result = await fs.showSelectDialog({
        type: "openFile",
        title: "打开 Markdown 文件",
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx", "txt"] }],
      });
      if (result?.path) {
        documentRegistry.openEditor({ kind: "looseFile", absolutePath: result.path });
      }
    } catch (error) {
      console.warn("[editor] 打开 loose file 失败", error);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabList}
          contentContainerStyle={{ alignItems: "stretch" }}
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
            <DesktopEditorTab
              key={id}
              active={id === activeEditorId}
              dirty={dirty}
              title={title}
              onActivate={() => activateEditor(id)}
              onClose={() => requestClose(id)}
              viewRef={(node) => {
                if (node) tabNodes.current.set(id, node);
                else tabNodes.current.delete(id);
              }}
              onLayout={(event) => {
                tabBounds.current.set(id, event.nativeEvent.layout);
                revealActiveTab();
              }}
            />
          ))}
        </ScrollView>
      </View>
      {openEditorIds.map((id) => {
        const view = editorsById[id];
        const document = view ? documentsById[view.documentId] : null;
        if (!view || !document) return null;
        return (
          <View
            key={id}
            style={[styles.editorSurface, { display: activeEditorId === id ? "flex" : "none" }]}
          >
            {document.loadState === "ready" ? (
              <EditorWebView document={document} editor={view} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
                  {document.loadState === "error"
                    ? (document.loadError ?? "读取文档失败")
                    : "正在打开文档"}
                </Text>
              </View>
            )}
            {!isDesktop() && activeEditorId === id ? (
              <EditorToolbar document={document} editor={view} />
            ) : null}
          </View>
        );
      })}
      {activeViewer ? (
        <WorkspaceFilePreview
          key={`${activeViewer.viewerId}:${activeViewer.identityRevision}`}
          viewer={activeViewer}
        />
      ) : !activeEditor ? (
        <View style={styles.emptyState}>
          <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>尚未打开文档</Text>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => documentRegistry.openEditor({ kind: "untitled" })}
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
      <AlertDialog
        actionLabel={closeSaveError ? "重试保存" : "保存"}
        actionProps={{ disabled: isSavingBeforeClose, onPress: () => void saveBeforeClose() }}
        cancelLabel="取消"
        cancelProps={{ disabled: isSavingBeforeClose }}
        description={closeSaveError ?? "此文档包含尚未保存的更改。"}
        destructiveLabel="丢弃更改"
        destructiveProps={{ disabled: isSavingBeforeClose, onPress: discardBeforeClose }}
        dismissOnBackPress={!isSavingBeforeClose}
        dismissOnOverlayPress={!isSavingBeforeClose}
        onOpenChange={(open) => {
          if (!open && !isSavingBeforeClose) setCloseTargetEditorId(null);
        }}
        open={closeTargetEditorId !== null}
        title={closeSaveError ? "无法保存文档" : "关闭文档？"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editorSurface: {
    flex: 1,
    minHeight: 0,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  tabList: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    overflow: "hidden",
  },
  tabs: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 37,
  },
});
