import { type ComponentType, lazy } from "react";

import type {
  DialogId,
  DialogJsonValue,
  DialogPayloadMap,
  DialogWindowResultMap,
} from "./dialog_types";

export type DialogRendererProps<TDialogId extends DialogId = DialogId> = {
  requestId: string;
  onReady?: () => void;
  payload: DialogPayloadMap[TDialogId];
  onComplete: (result?: DialogWindowResultMap[TDialogId] | DialogJsonValue) => void;
};

const renderers: Record<DialogId, ComponentType<DialogRendererProps<any>>> = {
  settings: lazy(() =>
    import("./settings_dialog_renderer").then((m) => ({ default: m.SettingsDialogRenderer })),
  ),
  "native.confirm": lazy(() =>
    import("./confirm_dialog_renderer").then((m) => ({ default: m.ConfirmDialogRenderer })),
  ),
  "workspace.select": lazy(() =>
    import("./workspace_select_dialog_renderer").then((m) => ({
      default: m.WorkspaceSelectDialogRenderer,
    })),
  ),
  "workspace.details": lazy(() =>
    import("./renderers/workspace_details_renderer").then((m) => ({
      default: m.WorkspaceDetailsRenderer,
    })),
  ),
  "workspace.create": lazy(() =>
    import("./renderers/create_workspace_renderer").then((m) => ({
      default: m.CreateWorkspaceRenderer,
    })),
  ),
  "workspace.edit": lazy(() =>
    import("./renderers/edit_workspace_renderer").then((m) => ({
      default: m.EditWorkspaceRenderer,
    })),
  ),
  "workspace.entry.create": lazy(() =>
    import("./renderers/create_workspace_entry_renderer").then((m) => ({
      default: m.CreateWorkspaceEntryRenderer,
    })),
  ),
  "workspace.entry.rename": lazy(() =>
    import("./renderers/rename_workspace_entry_renderer").then((m) => ({
      default: m.RenameWorkspaceEntryRenderer,
    })),
  ),
  "workspace.entry.details": lazy(() =>
    import("./renderers/workspace_entry_details_renderer").then((m) => ({
      default: m.WorkspaceEntryDetailsRenderer,
    })),
  ),
  "settings.font-picker": lazy(() =>
    import("./renderers/font_picker_renderer").then((m) => ({ default: m.FontPickerRenderer })),
  ),
  "settings.licenses": lazy(() =>
    import("./renderers/licenses_renderer").then((m) => ({ default: m.LicensesRenderer })),
  ),
  "workspace.location": lazy(() =>
    import("./workspace_location_dialog_renderer").then((m) => ({
      default: m.WorkspaceLocationDialogRenderer,
    })),
  ),
  "workspace.directory-picker": lazy(() =>
    import("./renderers/directory_picker_renderer").then((m) => ({
      default: m.DirectoryPickerRenderer,
    })),
  ),
};

export function getDialogRenderer(
  dialogId: DialogId,
): ComponentType<DialogRendererProps<any>> | undefined {
  return renderers[dialogId];
}
