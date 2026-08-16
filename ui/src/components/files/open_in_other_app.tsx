import { useCallback, useState } from "react";
import { Button } from "rn-ui-kit";

import { openExternalFile } from "@/api/commands/utils";
import { workspace } from "@/api/commands/workspace";
import { getFileMimeType, resolveWorkspaceFileUrl } from "@/api/common";
import { useToast } from "@/hooks/ui";

type UseOpenInOtherAppOptions = {
  filePath?: string;
  workspaceId?: string | null;
};

export function useOpenInOtherApp({ filePath, workspaceId }: UseOpenInOtherAppOptions) {
  const { toast } = useToast();
  const [isOpening, setIsOpening] = useState(false);

  const openInOtherApp = useCallback(async () => {
    if (!workspaceId || !filePath || isOpening) {
      return;
    }

    setIsOpening(true);

    try {
      const workspaceSnapshot = await workspace.get(workspaceId);
      const fileUrl = resolveWorkspaceFileUrl(workspaceSnapshot, filePath);
      await openExternalFile(fileUrl, getFileMimeType(filePath));
    } catch (error) {
      console.error("[open-in-other-app] failed", error);
      toast.error(error instanceof Error ? error.message : "无法在其他应用中打开文件");
    } finally {
      setIsOpening(false);
    }
  }, [filePath, isOpening, toast, workspaceId]);

  return { isOpening, openInOtherApp };
}

export function OpenInOtherAppButton({
  isOpening,
  onOpenInOtherApp,
}: {
  isOpening: boolean;
  onOpenInOtherApp: () => void;
}) {
  return (
    <Button
      disabled={isOpening}
      native
      onPress={onOpenInOtherApp}
      title={isOpening ? "正在打开…" : "在其他应用中打开"}
    />
  );
}
