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

export type FileType = 'file' | 'directory';

export interface FileNode {
  children: FileNode[] | null;
  fileType: FileType;
  path: string;
  size: number | null;
  lastModified: number | null;
}

export interface FileTree {
  path: string;
  children: FileNode[];
}
