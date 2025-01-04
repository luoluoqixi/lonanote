import { create } from 'zustand';

import { WorkspaceMetadata, WorkspaceSettings } from '@/bindings/api/workspace';

export interface WorkspaceStore {
  currentWorkspaceMetadata: WorkspaceMetadata | null;
  currentWorkspaceSettings: WorkspaceSettings | null;
  setCurrentWorkspaceMetadata: (workspaceMetadata: WorkspaceMetadata) => void;
  setCurrentWorkspaceSettings: (workspaceSettings: WorkspaceSettings) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentWorkspaceMetadata: null,
  currentWorkspaceSettings: null,
  setCurrentWorkspaceMetadata: (currentWorkspaceMetadata) => set({ currentWorkspaceMetadata }),
  setCurrentWorkspaceSettings: (currentWorkspaceSettings) => set({ currentWorkspaceSettings }),
}));
