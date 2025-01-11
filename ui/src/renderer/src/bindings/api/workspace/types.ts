export interface WorkspaceMetadata {
  name: string;
  path: string;
  rootPath: string;
}

export interface WorkspaceSettings {}

export interface Workspace {
  metadata: WorkspaceMetadata;
  settings: WorkspaceSettings;
}
