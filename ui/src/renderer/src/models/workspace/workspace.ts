import { create } from 'zustand';

import { Workspace } from '@/bindings/api/workspace';

export interface WorkspaceStore {
  currentWorkspace: Workspace | null;
}

export const useWorkspaceStore = create<WorkspaceStore>(() => ({
  currentWorkspace: null,
}));
