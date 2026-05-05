export interface WorkspaceMetadata {
  id: string;
  name: string;
  path: string;
  updateTime?: number | null;
  createTime?: number | null;
}

export interface WorkspaceSettings {
  id: string;
  fileTreeSortType: FileTreeSortType | null;
  followGitignore: boolean;
  customIgnore: string;
  uploadImagePath: string;
  uploadAttachmentPath: string;
  histroySnapshootCount: number;
  createTime?: number | null;
}

export interface WorkspaceSaveData {
  id: string;
  lastOpenFilePath?: string | null;
}

export type WorkspaceLocator =
  | {
      kind: "absolutePath";
      path: string;
    }
  | {
      kind: "managedRoot";
      rootKey: string;
      relativePath: string;
    }
  | {
      kind: "iosBookmark";
      bookmarkId: string;
    }
  | {
      kind: "androidTreeUri";
      treeUri: string;
    };

export interface WorkspaceRecord {
  metadata: WorkspaceMetadata;
  locator: WorkspaceLocator;
  saveData: WorkspaceSaveData;
}

export type WorkspaceRootKind =
  | "desktop"
  | "mobileAppSandbox"
  | "mobileAppCloud"
  | "mobileAppExternalSandbox"
  | "custom";

export type WorkspaceRootSource =
  | {
      kind: "systemDefault";
    }
  | {
      kind: "userAdded";
    }
  | {
      kind: "iosBookmark";
      bookmarkId: string;
    }
  | {
      kind: "androidTreeUri";
      treeUri: string;
    };

export interface WorkspaceRoot {
  key: string;
  path: string;
  kind: WorkspaceRootKind;
  source: WorkspaceRootSource;
}

export interface WorkspaceSyncSummary {
  importedCount: number;
  relocatedCount: number;
}

export interface WorkspaceRuntimeConfig {
  fileTreeSortType: FileTreeSortType | null;
  followGitignore: boolean;
  customIgnore: string;
}

export type WorkspaceRuntimeStatus = "opening" | "opened" | "reinitializing" | "closing";

export interface WorkspaceState {
  record: WorkspaceRecord;
  settings: WorkspaceSettings;
  runtimeConfig: WorkspaceRuntimeConfig;
  runtimeStatus: WorkspaceRuntimeStatus;
}

export type FileType = "file" | "directory";

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
  | "name"
  | "nameRev"
  | "lastModifiedTime"
  | "lastModifiedTimeRev"
  | "createTime"
  | "createTimeRev";

export interface FileTree {
  path: string;
  sortType: FileTreeSortType;
  root?: FileNode | null;
}
