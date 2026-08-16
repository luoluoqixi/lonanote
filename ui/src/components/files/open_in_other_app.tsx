import { Ellipsis, ExternalLink } from "@tamagui/lucide-icons-2";
import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { Button, Menu, type MenuItemData, useMenuTriggerState, useTheme } from "rn-ui-kit";

import { openExternalFile } from "@/api/commands/utils";
import { workspace } from "@/api/commands/workspace";
import { getFileMimeType, resolveWorkspaceFileUrl } from "@/api/common";
import { useToast } from "@/hooks/ui";

type UseOpenInOtherAppOptions = {
  filePath?: string;
  workspaceId?: string | null;
};

function OpenInOtherAppMenuTrigger({ accessibilityLabel }: { accessibilityLabel: string }) {
  const { opacity } = useMenuTriggerState();

  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      chromeless
      circular
      hitSlop={8}
      opacity={opacity}
    >
      <Ellipsis size={20} />
    </Button>
  );
}

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

export function OpenInOtherAppMenu({
  accessibilityLabel = "文件操作",
  isOpening,
  onOpenInOtherApp,
}: {
  accessibilityLabel?: string;
  isOpening: boolean;
  onOpenInOtherApp: () => void;
}) {
  const theme = useTheme();
  const accentColor = theme.color10.val as ComponentProps<typeof ExternalLink>["color"];
  const items = useMemo<MenuItemData[]>(
    () => [
      {
        disabled: isOpening,
        icon: <ExternalLink color={accentColor} size={14} />,
        iconProps: {
          ios: { name: "arrow.up.forward.app" },
        },
        label: isOpening ? "正在打开…" : "在其他应用中打开",
        onPress: onOpenInOtherApp,
        value: "open-in-other-app",
      },
    ],
    [accentColor, isOpening, onOpenInOtherApp],
  );

  return (
    <Menu
      trigger={() => <OpenInOtherAppMenuTrigger accessibilityLabel={accessibilityLabel} />}
      items={items}
      nativeHaptics
    />
  );
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
