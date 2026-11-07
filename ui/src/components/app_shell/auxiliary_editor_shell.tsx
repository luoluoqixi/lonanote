import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "rn-ui-kit";

import { clipboard } from "@/api/commands/system/clipboard";
import { editorWindows } from "@/api/commands/win/editor_windows";
import { editorWindowService } from "@/components/editor/controllers/editor_window_service";
import { DesktopEditorArea } from "@/components/editor/desktop/desktop_editor_area";
import { useDesktopWindowLifecycle } from "@/hooks/editor/use_desktop_window_lifecycle";
import { useEditorSession } from "@/hooks/editor/use_editor_session";
import { useEditorWindows } from "@/hooks/editor/use_editor_windows";

export function AuxiliaryEditorShell() {
  useDesktopWindowLifecycle();
  const state = useEditorWindows();
  const { openEditorIds } = useEditorSession();
  const hadTabs = useRef(false);
  useEffect(() => {
    if (openEditorIds.length) {
      hadTabs.current = true;
      return;
    }
    if (!state.ready || !hadTabs.current) return;
    const timer = setTimeout(() => {
      void editorWindows.closeCurrent().catch(console.error);
    }, 100);
    return () => clearTimeout(timer);
  }, [state.ready, openEditorIds.length]);
  return (
    <View nativeID="auxiliary-editor-shell" style={styles.root}>
      <DesktopEditorArea />
      {!state.connected && (
        <View style={styles.disconnected}>
          <Text accessibilityRole="alert">
            {state.ownerDestroyed
              ? "原窗口已意外关闭，草稿已保留。请复制草稿后关闭此窗口。"
              : "编辑器连接已断开，草稿已保留。重新连接前暂停编辑。"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void editorWindowService
                .getRecoveryDraft()
                .then(clipboard.writeText)
                .catch(console.error)
            }
          >
            <Text>复制保留的草稿</Text>
          </Pressable>
          {!state.ownerDestroyed && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void editorWindowService.retry().catch(console.error)}
            >
              <Text>重新连接</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  disconnected: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
