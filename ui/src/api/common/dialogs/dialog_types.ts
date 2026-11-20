import type { FontConsumer } from "@/api/commands/fonts/types";
import type {
  ExternalWorkspaceStorageBindingRequest,
  WorkspaceIndexEntry,
  WorkspaceListItem,
  WorkspaceStorageBindingRequest,
} from "@/api/commands/workspace";

export type DirectoryPickerOptions = {
  workspaceId: string;
  purpose: "save" | "move" | "copy";
  initialPath?: string;
  excludedPaths?: readonly string[];
  suggestedFileName?: string;
  sourceCount?: number;
};

export type DirectoryPickerResult = { directory: string; fileName?: string };

export type DialogJsonValue =
  | null
  | boolean
  | number
  | string
  | DialogJsonValue[]
  | { [key: string]: DialogJsonValue };

export function isDialogWindowRendererFailure(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "__dialogRendererFailure" in value &&
    value.__dialogRendererFailure === true
  );
}

export type DialogId =
  | "native.confirm"
  | "settings"
  | "workspace.select"
  | "workspace.details"
  | "workspace.entry.create"
  | "workspace.entry.rename"
  | "workspace.entry.details"
  | "settings.font-picker"
  | "settings.licenses"
  | "workspace.create"
  | "workspace.edit"
  | "workspace.location"
  | "workspace.directory-picker";

export type DialogPayloadMap = {
  "native.confirm": {
    title: string;
    message: string;
    buttons: Array<{ key: string; text: string; style?: "cancel" | "destructive" | "default" }>;
  };
  settings: { initialPageId: string };
  "workspace.select": { currentWorkspaceId: string | null };
  "workspace.details": { workspaceItem: WorkspaceListItem };
  "workspace.entry.create": {
    entryKind: "directory" | "note";
    name: string;
    parentPath: string;
  };
  "workspace.entry.rename": { name: string };
  "workspace.entry.details": { entry: WorkspaceIndexEntry; rootName?: string };
  "settings.font-picker": { consumer: FontConsumer };
  "settings.licenses": null;
  "workspace.create": { displayName: string };
  "workspace.edit": { displayName: string; workspaceId: string };
  "workspace.location": { workspaceItem: WorkspaceListItem; mode: "relocate" | "rebind" };
  "workspace.directory-picker": { token: number; options: DirectoryPickerOptions };
};

export type DialogWindowResultMap = {
  "native.confirm": string;
  settings: null;
  "workspace.select": string;
  "workspace.details": null;
  "workspace.entry.create": { name: string };
  "workspace.entry.rename": { name: string };
  "workspace.entry.details": null;
  "settings.font-picker": null;
  "settings.licenses": null;
  "workspace.create": {
    displayName: string;
    providerId: string;
    isManaged: boolean;
    directoryName: string;
    externalBinding: ExternalWorkspaceStorageBindingRequest | null;
  };
  "workspace.edit": { action: "save"; displayName: string } | { action: "relocate" | "rebind" };
  "workspace.location": WorkspaceStorageBindingRequest;
  "workspace.directory-picker": { token: number; result: DirectoryPickerResult | null };
};

export type DialogWindowRequest<TDialogId extends DialogId = DialogId> = {
  requestId: string;
  dialogId: TDialogId;
  payload: DialogPayloadMap[TDialogId];
  title: string;
  width: number;
  height: number;
  blockParentInput?: boolean;
  parentRequestId?: string;
};

export type DialogWindowSession<TDialogId extends DialogId = DialogId> = {
  currentWorkspaceId?: string | null;
  title: string;
  requestId: string;
  dialogId: TDialogId;
  payload: DialogPayloadMap[TDialogId];
  blockParentInput: boolean;
};
