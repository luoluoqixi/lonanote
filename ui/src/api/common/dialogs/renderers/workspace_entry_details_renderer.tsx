import { WorkspaceEntryDetailsSheet } from "@/components/workspaces/workspace_explorer/workspace_entry_details_sheet";

import type { DialogRendererProps } from "../dialog_content_registry";

export function WorkspaceEntryDetailsRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.entry.details">) {
  return (
    <WorkspaceEntryDetailsSheet
      dialogContentOnly
      entry={payload.entry}
      rootName={payload.rootName}
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  );
}
