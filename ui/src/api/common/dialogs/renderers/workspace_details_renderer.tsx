import { WorkspaceDetailsSheet } from "@/components/workspaces/workspace_select/workspace_details_sheet";

import type { DialogRendererProps } from "../dialog_content_registry";

export function WorkspaceDetailsRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.details">) {
  return (
    <WorkspaceDetailsSheet
      dialogContentOnly
      workspaceItem={payload.workspaceItem}
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  );
}
