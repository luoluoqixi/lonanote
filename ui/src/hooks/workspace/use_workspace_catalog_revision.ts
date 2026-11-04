import { useStore } from "zustand";

import { workspaceCatalogRevisionStore } from "@/stores/workspace/workspace_catalog_revision";

const invalidateCatalog = () =>
  workspaceCatalogRevisionStore.setState((state) => ({ revision: state.revision + 1 }));

export function useWorkspaceCatalogRevision() {
  const revision = useStore(workspaceCatalogRevisionStore, (state) => state.revision);
  return { revision, invalidateCatalog };
}
