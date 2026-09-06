import { StyleSheet, Text, View } from "react-native";
import { useUiTheme } from "rn-ui-kit";

import { useEditorSession } from "@/hooks/editor";

function getSaveStateLabel(saveState: "idle" | "scheduled" | "saving" | "error" | "conflict") {
  switch (saveState) {
    case "scheduled":
      return "等待保存";
    case "saving":
      return "正在保存";
    case "error":
      return "保存失败";
    case "conflict":
      return "外部修改冲突";
    case "idle":
      return "已保存";
  }
}

export function DesktopEditorStatusBar() {
  const theme = useUiTheme();
  const { activeEditorId, documentsById, editorsById } = useEditorSession();
  const editor = activeEditorId ? editorsById[activeEditorId] : null;
  const document = editor ? documentsById[editor.documentId] : null;

  if (!editor || !document) {
    return <View style={styles.root} />;
  }

  const state = editor.editorState;
  return (
    <View style={styles.root}>
      <Text numberOfLines={1} style={[styles.text, { color: theme.mutedForeground }]}>
        {getSaveStateLabel(document.saveState)}
      </Text>
      <Text numberOfLines={1} style={[styles.text, { color: theme.mutedForeground }]}>
        行 {state.row}，列 {state.column}
      </Text>
      <Text numberOfLines={1} style={[styles.text, { color: theme.mutedForeground }]}>
        {state.characterCount} 个字符
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "flex-end",
    minWidth: 0,
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 12,
  },
});
