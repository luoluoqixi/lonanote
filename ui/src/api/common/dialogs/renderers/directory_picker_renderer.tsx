import { DirectoryPickerHost } from "@/components/workspaces/directory_picker/directory_picker_host";

import type { DialogRendererProps } from "../dialog_content_registry";

export function DirectoryPickerRenderer({
  payload,
  onComplete,
  onReady,
}: DialogRendererProps<"workspace.directory-picker">) {
  return (
    <DirectoryPickerHost
      dialogContentOnly
      dialogPayload={payload}
      onDialogComplete={onComplete}
      onContentReady={onReady}
    />
  );
}
