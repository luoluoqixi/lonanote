export interface WorkspaceMetadata {
  name: string;
  path: string;
  rootPath: string;
  lastOpenTime: number;
}

export interface WorkspaceSettings {}

export interface WorkspaceSaveData {
  lastOpenFilePath: string;
}

export interface Workspace {
  metadata: WorkspaceMetadata;
  settings: WorkspaceSettings;
}
