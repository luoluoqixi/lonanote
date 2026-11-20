import { useEffect, useState } from "react";

import { CreateWorkspaceSheet } from "@/components/workspaces/workspace_select/create_workspace_sheet";
import { useWorkspaceStorageTarget } from "@/hooks/workspace/use_workspace_storage_target";

import type { DialogRendererProps } from "../dialog_content_registry";

export function CreateWorkspaceRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.create">) {
  const target = useWorkspaceStorageTarget();
  const [displayName, setDisplayName] = useState(payload.displayName);
  useEffect(() => {
    void target.load();
  }, [target.load]);

  return (
    <CreateWorkspaceSheet
      dialogContentOnly
      displayName={displayName}
      isCreating={false}
      onDisplayNameChange={setDisplayName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => {
        if (!target.providerId || target.isLoading || target.isChoosing) return;
        onComplete({
          displayName,
          providerId: target.providerId,
          isManaged: target.isManaged,
          directoryName: target.directoryName,
          externalBinding: target.externalBinding,
        });
      }}
      open
      target={target}
    />
  );
}
