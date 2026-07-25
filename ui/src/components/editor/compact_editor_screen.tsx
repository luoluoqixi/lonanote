import { useLocalSearchParams } from "expo-router";

import { CompactContentScreen } from "@/components/app_shell";

export function CompactEditorScreen() {
  const { editorId } = useLocalSearchParams<{ editorId?: string | string[] }>();
  const resolvedEditorId = Array.isArray(editorId) ? editorId[0] : editorId;

  return (
    <CompactContentScreen
      description={
        resolvedEditorId ? `正在打开：${resolvedEditorId}` : "选择一个文档后即可开始编辑。"
      }
      title="编辑器"
    />
  );
}
