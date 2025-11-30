import { create } from 'zustand';

import { Workspace, WorkspaceMetadata } from '@/bindings/api';

export interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  workspaces: WorkspaceMetadata[];
  isWorkspaceLoading?: boolean;
}

export const useWorkspaceStore = create<WorkspaceStore>(() => ({
  currentWorkspace: null,
  workspaces: [],
  isWorkspaceLoading: false,
}));
