import { useEffect, useState } from "react";

import { CreateWorkspaceEntrySheet } from "@/components/workspaces/workspace_explorer/create_workspace_entry_sheet";

import type { DialogRendererProps } from "../dialog_content_registry";

export function CreateWorkspaceEntryRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.entry.create">) {
  const [name, setName] = useState(payload.name);
  return (
    <CreateWorkspaceEntrySheet
      modalName="dialog-workspace-entry-create"
      dialogContentOnly
      entryKind={payload.entryKind}
      name={name}
      parentPath={payload.parentPath}
      isCreating={false}
      open
      onNameChange={setName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => onComplete({ name })}
    />
  );
}
