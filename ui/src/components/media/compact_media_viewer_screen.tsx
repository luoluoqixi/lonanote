import { useLocalSearchParams } from "expo-router";

import { CompactContentScreen } from "@/components/app_shell";

export function CompactMediaViewerScreen() {
  const { viewerId } = useLocalSearchParams<{ viewerId?: string | string[] }>();
  const resolvedViewerId = Array.isArray(viewerId) ? viewerId[0] : viewerId;

  return (
    <CompactContentScreen
      description={
        resolvedViewerId ? `正在查看：${resolvedViewerId}` : "选择一个媒体文件后即可查看。"
      }
      title="媒体查看器"
    />
  );
}
