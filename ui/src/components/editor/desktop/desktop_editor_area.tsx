import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "rn-ui-kit";
import { Spinner, useUiTheme } from "rn-ui-kit";

import { isDesktop, isWeb } from "@/api/common/platform";
import { EditorToolbar } from "@/components/editor/editor_toolbar";
import { EditorWebView } from "@/components/editor/editor_webview";
import { useEditorSession } from "@/hooks/editor";
import { useWorkbenchDragGuard } from "@/hooks/ui/use_workbench_drag_guard";
import { editorStore } from "@/stores/editor";

import { DesktopEditorGroup } from "./desktop_editor_group";
import { DesktopEditorSurface } from "./desktop_editor_surface";
import { type GroupDivider, getEditorGroupGeometry } from "./editor_group_geometry";

function EditorDivider({
  divider,
  width,
  height,
}: {
  divider: GroupDivider;
  width: number;
  height: number;
}) {
  const theme = useUiTheme();
  const guard = useWorkbenchDragGuard();
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHover = () => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  useEffect(() => () => clearHover(), []);
  const cursor = divider.direction === "row" ? "ew-resize" : "ns-resize";
  useEffect(() => {
    if (!dragging || !isWeb()) return;
    const bodyCursor = document.body.style.cursor;
    const rootCursor = document.documentElement.style.cursor;
    document.body.style.cursor = cursor;
    document.documentElement.style.cursor = cursor;
    const end = () => setDragging(false);
    window.addEventListener("blur", end);
    return () => {
      document.body.style.cursor = bodyCursor;
      document.documentElement.style.cursor = rootCursor;
      window.removeEventListener("blur", end);
    };
  }, [cursor, dragging]);
  const latest = useRef({ divider, width, height, guard });
  latest.current = { divider, width, height, guard };
  const startRatio = useRef(divider.ratio);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRatio.current = latest.current.divider.ratio;
          setDragging(true);
          latest.current.guard.onDragStart();
        },
        onPanResponderMove: (_, gesture) => {
          const { divider, width, height } = latest.current;
          const size =
            divider.direction === "row" ? width * divider.rect.width : height * divider.rect.height;
          if (size)
            editorStore
              .getState()
              .setSplitRatio(
                divider.splitId,
                startRatio.current + (divider.direction === "row" ? gesture.dx : gesture.dy) / size,
              );
        },
        onPanResponderRelease: () => {
          setDragging(false);
          latest.current.guard.onDragEnd();
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          latest.current.guard.onDragEnd();
        },
      }),
    [],
  );
  const { rect, direction, ratio } = divider;
  const thickness = hovered || dragging ? 3 : 1;
  return (
    <View
      {...responder.panHandlers}
      onPointerEnter={() => {
        clearHover();
        hoverTimer.current = setTimeout(() => {
          setHovered(true);
          hoverTimer.current = null;
        }, 300);
      }}
      onPointerLeave={() => {
        clearHover();
        setHovered(false);
      }}
      style={[
        styles.divider,
        isWeb() ? ({ cursor } as unknown as ViewStyle) : null,
        direction === "row"
          ? {
              left: `${(rect.left + rect.width * ratio) * 100}%`,
              top: `${rect.top * 100}%`,
              height: `${rect.height * 100}%`,
              width: 8,
              marginLeft: -4,
            }
          : {
              left: `${rect.left * 100}%`,
              top: `${(rect.top + rect.height * ratio) * 100}%`,
              width: `${rect.width * 100}%`,
              height: 8,
              marginTop: -4,
            },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            backgroundColor: hovered || dragging ? theme.primary : theme.border,
          },
          direction === "row"
            ? { width: thickness, top: 0, bottom: 0, left: (8 - thickness) / 2 }
            : { height: thickness, left: 0, right: 0, top: (8 - thickness) / 2 },
        ]}
      />
    </View>
  );
}

export function DesktopEditorArea({
  onRevealInExplorer,
}: {
  onRevealInExplorer?: (workspaceId: string, path: string) => Promise<void>;
}) {
  const theme = useUiTheme();
  const { getSnapshot } = useEditorSession();
  const state = getSnapshot();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const geometry = getEditorGroupGeometry(state.layout);
  return (
    <View
      nativeID="desktop-editor-area"
      style={styles.root}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize({ width: layout.width, height: layout.height })
      }
    >
      {Object.keys(state.groupsById).map((groupId) => {
        const rect = geometry.groups[groupId];
        if (!rect) return null;
        return (
          <View
            key={groupId}
            style={{
              position: "absolute",
              left: `${rect.left * 100}%`,
              top: `${rect.top * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <DesktopEditorGroup groupId={groupId} onRevealInExplorer={onRevealInExplorer} />
          </View>
        );
      })}
      {/* 每个 editor 始终保留在 area 的同一层级；跨组移动只修改矩形，不重建 iframe。 */}
      {Object.keys(state.editorsById).map((id) => {
        const editor = state.editorsById[id];
        const groupId = editor.groupId;
        const group = groupId ? state.groupsById[groupId] : null;
        const rect = groupId ? geometry.groups[groupId] : null;
        const document = state.documentsById[editor.documentId];
        if (!group || !rect || !document) return null;
        const visible = group.activeTabId === id;
        return (
          <View
            key={id}
            pointerEvents="box-none"
            nativeID={`desktop-editor-surface-${encodeURIComponent(groupId!)}:${id}`}
            style={{
              position: "absolute",
              left: `${rect.left * 100}%`,
              top: `${rect.top * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
              zIndex: visible ? 2 : -1,
            }}
          >
            <View
              pointerEvents={visible ? "auto" : "none"}
              style={{
                position: "absolute",
                top: 37,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: "hidden",
              }}
            >
              <DesktopEditorSurface active={visible} backgroundColor={theme.background}>
                {document.loadState === "ready" ? (
                  <EditorWebView
                    active={visible && state.activeGroupId === groupId}
                    document={document}
                    editor={editor}
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    {document.loadState === "error" ? (
                      <Text style={{ color: theme.mutedForeground }}>
                        {document.loadError ?? "读取文档失败"}
                      </Text>
                    ) : (
                      <Spinner size="sm" />
                    )}
                  </View>
                )}
                {!isDesktop() && visible ? (
                  <EditorToolbar document={document} editor={editor} />
                ) : null}
              </DesktopEditorSurface>
            </View>
          </View>
        );
      })}
      {geometry.dividers.map((divider) => (
        <EditorDivider key={divider.splitId} divider={divider} {...size} />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, minWidth: 0, position: "relative" },
  divider: { position: "absolute", zIndex: 20 },
});
