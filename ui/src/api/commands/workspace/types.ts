export type WorkspaceId = string;
export type StorageProviderId = string;
export type WorkspaceDirectoryName = string;
export type WorkspaceRelativePath = string;
/** Provider 自己解释的资源引用；通用 TS 代码不应把它当作文件路径。 */
export type StorageResourceRef = string;
/** Rust Workspace DTO 使用的 Unix 秒时间戳。 */
export type UnixSeconds = number;
/** `Vec<u8>` 经过当前 JSON invoke bridge 后的传输形态。 */
export type ByteArrayJson = number[];
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface WorkspaceSyncSettings {
  providerId: StorageProviderId | null;
  [option: string]: JsonValue;
}

export interface WorkspaceSettings {
  schemaVersion: number;
  followGitignore: boolean;
  customIgnore: string;
  uploadImagePath: WorkspaceRelativePath;
  uploadAttachmentPath: WorkspaceRelativePath;
  historySnapshotCount: number;
  sync?: WorkspaceSyncSettings;
}

export interface WorkspaceLocalSetting {
  schemaVersion: number;
  lastOpenedAt: UnixSeconds | null;
  lastOpenFile: WorkspaceRelativePath | null;
}

export type WorkspaceAvailability =
  | "unknown"
  | "available"
  | "notFound"
  | "authorizationRequired"
  | "authorizationRevoked"
  | "providerUnavailable"
  | "offline"
  | "notDownloaded"
  | "volumeUnavailable"
  | "invalidManifest"
  | "workspaceIdMismatch";

export type WorkspaceRuntimeStatus = "open" | "closed";
export type WorkspaceStorageKind = "managed" | "external";

export interface WorkspaceStorageView {
  kind: WorkspaceStorageKind;
  providerId: StorageProviderId;
  directoryName: WorkspaceDirectoryName | null;
}

export interface WorkspaceSnapshot {
  id: WorkspaceId;
  displayName: string;
  storage: WorkspaceStorageView;
  settings: WorkspaceSettings;
  status: WorkspaceRuntimeStatus;
}

export interface WorkspaceListItem {
  id: WorkspaceId;
  displayName: string;
  createdAt: UnixSeconds | null;
  lastOpenedAt: UnixSeconds | null;
  storage: WorkspaceStorageView;
  storageKind: WorkspaceStorageKind;
  availability: WorkspaceAvailability;
}

export type ManagedWorkspaceStorageBindingRequest = {
  kind: "managed";
  providerId: StorageProviderId;
  providerSchemaVersion: number;
  directoryName: WorkspaceDirectoryName;
};

export type ExternalWorkspaceStorageBindingRequest = {
  kind: "external";
  providerId: StorageProviderId;
  providerSchemaVersion: number;
  resourceRef: StorageResourceRef;
};

export type WorkspaceStorageBindingRequest =
  | ManagedWorkspaceStorageBindingRequest
  | ExternalWorkspaceStorageBindingRequest;

export interface AttachWorkspaceResult {
  id: WorkspaceId;
  displayName: string;
  storage: WorkspaceStorageView;
}

export type WorkspaceStorageTarget =
  | {
      kind: "managed";
      providerId: StorageProviderId;
      preferredDirectoryName: WorkspaceDirectoryName;
    }
  | {
      kind: "external";
      binding: ExternalWorkspaceStorageBindingRequest;
    };

export type StorageCleanupStatus =
  | { status: "retained" }
  | { status: "removed" }
  | { status: "failed"; message: string };

export interface RemoveWorkspaceResult {
  workspaceId: WorkspaceId;
  storage: WorkspaceStorageView;
  fileCleanup: StorageCleanupStatus;
}

export interface RelocateWorkspaceResult {
  workspaceId: WorkspaceId;
  sourceStorage: WorkspaceStorageView;
  targetStorage: WorkspaceStorageView;
  sourceCleanup: StorageCleanupStatus;
}

export type StorageEntryKind = "file" | "directory";

export interface StorageEntryMetadata {
  kind: StorageEntryKind;
  size: number | null;
  createdAt: UnixSeconds | null;
  modifiedAt: UnixSeconds | null;
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
  canAtomicReplace: boolean;
  canWatch: boolean;
  hasNativePath: boolean;
}

export type FileType = "file" | "directory";

export interface FileNode {
  path: WorkspaceRelativePath;
  fileType: FileType;
  lastModifiedTime: UnixSeconds | null;
  createTime: UnixSeconds | null;
  size: number | null;
  fileCount: number;
  dirCount: number;
  /** `null` 表示没有返回 children，可能是未递归展开，也可能是空目录。 */
  children: FileNode[] | null;
}

export interface FileTree {
  root: FileNode | null;
}

export interface WriteWorkspaceFileOptions {
  overwrite?: boolean;
  createParent?: boolean;
}
