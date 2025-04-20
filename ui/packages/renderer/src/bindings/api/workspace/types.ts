export interface WorkspaceMetadata {
  name: string;
  path: string;
  rootPath: string;
  lastOpenTime: number;
}

export interface WorkspaceSettings {
  fileTreeSortType: FileTreeSortType | null;
  followGitignore: boolean;
  customIgnore: string;
  uploadImagePath: string;
  uploadAttachmentPath: string;
  histroySnapshootCount: number;
}

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
  lastModifiedTime: number | null;
  createTime: number | null;
  fileCount: number;
  dirCount: number;
}

export type FileTreeSortType =
  | 'name'
  | 'nameRev'
  | 'lastModifiedTime'
  | 'lastModifiedTimeRev'
  | 'createTime'
  | 'createTimeRev';

export interface FileTree {
  path: string;
  sortType: FileTreeSortType;
  root?: FileNode | null;
}
