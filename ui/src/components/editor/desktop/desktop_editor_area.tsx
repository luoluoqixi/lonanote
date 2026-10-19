import { FilePlus2, FolderOpen, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlertDialog, Button, useUiTheme } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { isDesktop } from "@/api/common/platform";
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
  const revealTab = useCallback((id: string | null) => {
    const bounds = id ? tabBounds.current.get(id) : null;
    if (!bounds) return;
    const left = scrollPosition.current;
    const width = viewportWidth.current;
    if (bounds.x < left) scrollRef.current?.scrollTo({ x: bounds.x, animated: true });
    else if (bounds.x + bounds.width > left + width)
      scrollRef.current?.scrollTo({ x: bounds.x + bounds.width - width, animated: true });
  }, []);
  useEffect(() => revealTab(activeEditorId), [activeEditorId, revealTab]);
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
            revealTab(activeEditorId);
          }}
          onScroll={(event) => {
            scrollPosition.current = event.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
        >
          {tabs.map(({ id, title, dirty }) => {
            const active = id === activeEditorId;
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => activateEditor(id)}
                onLayout={(event) => {
                  tabBounds.current.set(id, event.nativeEvent.layout);
                  if (active) revealTab(id);
                }}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? theme.background : theme.muted,
                    borderTopColor: active ? theme.primary : "transparent",
                    borderRightColor: theme.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    { color: active ? theme.foreground : theme.mutedForeground },
                  ]}
                >
                  {title}
                </Text>
                {dirty ? (
                  <View style={[styles.dirtyIndicator, { backgroundColor: theme.foreground }]} />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`关闭 ${title}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    requestClose(id);
                  }}
                  style={styles.closeTab}
                >
                  <X color={theme.mutedForeground} size={14} />
                </Pressable>
              </Pressable>
            );
          })}
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
                <Text style={{ color: theme.mutedForeground }}>
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
          <Text style={{ color: theme.mutedForeground }}>尚未打开文档</Text>
          <Button variant="ghost" onPress={() => documentRegistry.openEditor({ kind: "untitled" })}>
            <FilePlus2 size={16} color={theme.mutedForeground} />
            新建笔记
          </Button>
          {canOpenLooseFile ? (
            <Button variant="ghost" onPress={() => void openLooseFile()}>
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
  dirtyIndicator: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
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
  tab: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    height: 36,
    maxWidth: 220,
    borderTopWidth: 2,
    borderRightWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    minWidth: 112,
    paddingLeft: 10,
  },
  closeTab: { width: 26, height: 30, alignItems: "center", justifyContent: "center" },
  tabLabel: {
    flex: 1,
    fontSize: 13,
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
