import { useLocalSearchParams } from "expo-router";

import { CompactContentScreen } from "@/components/app_shell";

type CompactWorkspaceExplorerScreenProps = {
  showsRoutePath?: boolean;
};

export function CompactWorkspaceExplorerScreen({
  showsRoutePath = false,
}: CompactWorkspaceExplorerScreenProps) {
  const { path } = useLocalSearchParams<{ path?: string | string[] }>();
  const resolvedPath = Array.isArray(path) ? path.join("/") : path;
  const description =
    showsRoutePath && resolvedPath
      ? `当前目录：${resolvedPath}`
      : "浏览当前工作区中的文件和文件夹。";

  return <CompactContentScreen description={description} title="文件" />;
}
