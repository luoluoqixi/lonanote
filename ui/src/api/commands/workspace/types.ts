export type WorkspaceId = string;
export type StorageMountId = string;
export type WorkspaceRelativePath = string;

export type FileTreeSortType =
  | "name"
  | "nameRev"
  | "lastModifiedTime"
  | "lastModifiedTimeRev"
  | "createTime"
  | "createTimeRev";

export interface WorkspaceSettings {
  fileTreeSortType: FileTreeSortType;
  followGitignore: boolean;
  customIgnore: string;
  uploadImagePath: WorkspaceRelativePath;
  uploadAttachmentPath: WorkspaceRelativePath;
  histroySnapshootCount: number;
}

export interface WorkspaceSaveData {
  id: WorkspaceId;
  lastOpenFilePath?: WorkspaceRelativePath | null;
}

export interface WorkspaceLocator {
  mountId: StorageMountId;
  relativePath: WorkspaceRelativePath;
}

export interface WorkspaceRecord {
  id: WorkspaceId;
  name: string;
  locator: WorkspaceLocator;
  createTime?: number | null;
  updateTime?: number | null;
  saveData: WorkspaceSaveData;
}

export type WorkspaceRecordAvailability =
  | "available"
  | "workspaceNotFound"
  | "mountNotFound"
  | "mountUnavailable"
  | "manifestNotFound"
  | "workspaceIdMismatch"
  | "unsupportedManifestSchema"
  | "invalid";

export interface WorkspaceRecordStatus {
  workspaceId: WorkspaceId;
  availability: WorkspaceRecordAvailability;
  mountStatus?: StorageMountStatus | null;
  message?: string | null;
}

export type StorageMountKind =
  | {
      kind: "desktopAbsolute";
      basePath: string;
    }
  | {
      kind: "desktopDocuments";
    }
  | {
      kind: "iosAppDocuments";
    }
  | {
      kind: "iosICloud";
      containerId: string;
    }
  | {
      kind: "iosBookmark";
      bookmarkRef: string;
    }
  | {
      kind: "androidAppInternal";
    }
  | {
      kind: "androidDocumentTree";
      grantRef: string;
    };

export interface StorageMountRecord {
  id: StorageMountId;
  displayName: string;
  kind: StorageMountKind;
  createdTime: number;
}

export type StorageAvailability =
  | "available"
  | "offline"
  | "notDownloaded"
  | "authorizationRequired"
  | "authorizationRevoked"
  | "volumeUnavailable"
  | "providerUnavailable"
  | "notFound"
  | "unsupported";

export interface StorageMountStatus {
  mountId: StorageMountId;
  availability: StorageAvailability;
  capabilities?: StorageCapabilities | null;
  message?: string | null;
}

export interface ScanStorageMountRequest {
  mountId: StorageMountId;
  parentPath: WorkspaceRelativePath;
}

export type WorkspaceScanEntryStatus =
  | "ready"
  | "registered"
  | "duplicateWorkspaceId"
  | "manifestMissing"
  | "unsupportedManifestSchema"
  | "invalid";

export interface WorkspaceScanEntry {
  locator: WorkspaceLocator;
  status: WorkspaceScanEntryStatus;
  workspaceId?: WorkspaceId | null;
  name?: string | null;
  createTime?: number | null;
  registeredLocator?: WorkspaceLocator | null;
  message?: string | null;
}

export interface ScanStorageMountResult {
  mountId: StorageMountId;
  parentPath: WorkspaceRelativePath;
  entries: WorkspaceScanEntry[];
}

export interface CreateWorkspaceRequest {
  name: string;
  mountId: StorageMountId;
  parentPath: WorkspaceRelativePath;
}

export interface AttachWorkspaceRequest {
  mountId: StorageMountId;
  workspacePath: WorkspaceRelativePath;
  initializeIfMissing?: boolean;
}

export interface MoveWorkspaceRequest {
  workspaceId: WorkspaceId;
  destinationMountId: StorageMountId;
  destinationParentPath: WorkspaceRelativePath;
  deleteSourceAfterCommit?: boolean;
}

export type WorkspaceCleanupStatus =
  | {
      status: "notRequested";
    }
  | {
      status: "removed";
    }
  | {
      status: "failed";
      message: string;
    };

export interface MoveWorkspaceResult {
  record: WorkspaceRecord;
  sourceLocator: WorkspaceLocator;
  sourceCleanup: WorkspaceCleanupStatus;
}

export interface RemoveWorkspaceResult {
  record: WorkspaceRecord;
  fileCleanup: WorkspaceCleanupStatus;
}

export interface WorkspaceRuntimeConfig {
  fileTreeSortType: FileTreeSortType;
  followGitignore: boolean;
  customIgnore: string;
}

export type WorkspaceRuntimeStatus = "opening" | "opened" | "closing";

export interface WorkspaceState {
  record: WorkspaceRecord;
  settings: WorkspaceSettings;
  runtimeConfig: WorkspaceRuntimeConfig;
  runtimeStatus: WorkspaceRuntimeStatus;
}

export type StorageEntryKind = "file" | "directory";

export interface StorageEntryMetadata {
  kind: StorageEntryKind;
  size?: number | null;
  createdTime?: number | null;
  modifiedTime?: number | null;
}

export interface StorageEntry {
  path: WorkspaceRelativePath;
  metadata: StorageEntryMetadata;
}

export interface StorageCapabilities {
  canRead: boolean;
  canWrite: boolean;
  canCreateDirectory: boolean;
  canDelete: boolean;
  canRename: boolean;
  canMove: boolean;
  canAtomicReplace: boolean;
  canWatch: boolean;
  hasCreationTime: boolean;
  hasModifiedTime: boolean;
  hasNativePath: boolean;
}

export interface FileNode {
  path: WorkspaceRelativePath;
  kind: StorageEntryKind;
  size?: number | null;
  createdTime?: number | null;
  modifiedTime?: number | null;
  fileCount: number;
  directoryCount: number;
  /**
   * `undefined`/`null` 表示目录尚未展开，空数组表示已展开且为空。
   */
  children?: FileNode[] | null;
}

export interface FileTree {
  root: FileNode;
  sortType: FileTreeSortType;
  recursive: boolean;
}
