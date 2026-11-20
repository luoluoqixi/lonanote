import { useEffect, useState } from "react";

import { EditWorkspaceSheet } from "@/components/workspaces/workspace_select/edit_workspace_sheet";

import type { DialogRendererProps } from "../dialog_content_registry";

export function EditWorkspaceRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.edit">) {
  const [displayName, setDisplayName] = useState(payload.displayName);
  return (
    <EditWorkspaceSheet
      dialogContentOnly
      displayName={displayName}
      isUpdating={false}
      onDisplayNameChange={setDisplayName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => onComplete({ action: "save", displayName })}
      onRelocate={() => onComplete({ action: "relocate" })}
      onRebind={() => onComplete({ action: "rebind" })}
      open
      workspaceId={payload.workspaceId}
    />
  );
}
