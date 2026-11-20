import { useEffect, useState } from "react";

import { RenameWorkspaceEntryContent } from "@/components/workspaces/workspace_explorer/rename_workspace_entry_content";

import type { DialogRendererProps } from "../dialog_content_registry";

export function RenameWorkspaceEntryRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.entry.rename">) {
  const [name, setName] = useState(payload.name);
  return (
    <RenameWorkspaceEntryContent
      dialogContentOnly
      name={name}
      isRenaming={false}
      open
      onNameChange={setName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => onComplete({ name })}
    />
  );
}
