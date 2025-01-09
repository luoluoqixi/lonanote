import { Workspace } from '@/bindings/api/workspace';
import { useWorkspaceStore } from '@/models/workspace';

export const useWorkspace = useWorkspaceStore;

export const setCurrentWorkspace = (currentWorkspace: Workspace) => {
  useWorkspaceStore.setState((s) => ({ ...s, currentWorkspace }));
};
