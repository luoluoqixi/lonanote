import { DesktopSettingsDialog } from "@/components/settings/desktop/settings_dialog";
import { DirectoryPickerHost } from "@/components/workspaces/directory_picker/directory_picker_host";

import type { DialogRendererProps } from "./dialog_content_registry";

export function SettingsDialogRenderer({
  payload,
  onComplete,
  onReady,
}: DialogRendererProps<"settings">) {
  return (
    <>
      <DirectoryPickerHost />
      <DesktopSettingsDialog
        initialPageId={payload.initialPageId as never}
        isOpen
        nativeWindow
        onContentReady={onReady}
        onOpenChange={(open) => {
          if (!open) onComplete(null);
        }}
      />
    </>
  );
}
