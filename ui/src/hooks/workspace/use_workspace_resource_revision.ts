import { useStore } from "zustand";

import { workspaceResourceSessionStore } from "@/stores/workspace/workspace_resource_session_store";

export function useWorkspaceResourceRevision(workspaceId: string | null | undefined) {
  return useStore(workspaceResourceSessionStore, (state) =>
    workspaceId ? (state.revisions[workspaceId] ?? 0) : 0,
  );
}
