import { create } from 'zustand';

import { Workspace } from '@/bindings/api/workspace';

export interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (currentWorkspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
}));
