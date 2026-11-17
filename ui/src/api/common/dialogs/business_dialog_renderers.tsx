import { useEffect, useState } from "react";

import { WorkspaceLocationDialogRenderer } from "@/api/common/dialogs/workspace_location_dialog_renderer";
import { FontPicker } from "@/components/settings/font_picker";
import { LicensesSettingsPage } from "@/components/settings/pages/licenses_settings_page";
import { DirectoryPickerHost } from "@/components/workspaces/directory_picker/directory_picker_host";
import { CreateWorkspaceEntrySheet } from "@/components/workspaces/workspace_explorer/create_workspace_entry_sheet";
import { RenameWorkspaceEntrySheet } from "@/components/workspaces/workspace_explorer/rename_workspace_entry_sheet";
import { WorkspaceEntryDetailsSheet } from "@/components/workspaces/workspace_explorer/workspace_entry_details_sheet";
import { CreateWorkspaceSheet } from "@/components/workspaces/workspace_select/create_workspace_sheet";
import { EditWorkspaceSheet } from "@/components/workspaces/workspace_select/edit_workspace_sheet";
import { WorkspaceDetailsSheet } from "@/components/workspaces/workspace_select/workspace_details_sheet";
import { useWorkspaceStorageTarget } from "@/hooks/workspace/use_workspace_storage_target";

import { registerDialogRenderer } from "./dialog_content_registry";
import type { DialogRendererProps } from "./dialog_content_registry";

function WorkspaceDetailsRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.details">) {
  return (
    <WorkspaceDetailsSheet
      dialogContentOnly
      workspaceItem={payload.workspaceItem}
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  );
}

function CreateWorkspaceRenderer({ payload, onComplete }: DialogRendererProps<"workspace.create">) {
  const target = useWorkspaceStorageTarget();
  const [displayName, setDisplayName] = useState(payload.displayName);
  useEffect(() => {
    void target.load();
  }, [target.load]);

  return (
    <CreateWorkspaceSheet
      dialogContentOnly
      displayName={displayName}
      isCreating={false}
      onDisplayNameChange={setDisplayName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => {
        if (!target.providerId || target.isLoading || target.isChoosing) return;
        onComplete({
          displayName,
          providerId: target.providerId,
          isManaged: target.isManaged,
          directoryName: target.directoryName,
          externalBinding: target.externalBinding,
        });
      }}
      open
      target={target}
    />
  );
}

function EditWorkspaceRenderer({ payload, onComplete }: DialogRendererProps<"workspace.edit">) {
  const [displayName, setDisplayName] = useState(payload.displayName);
  return (
    <EditWorkspaceSheet
      dialogContentOnly
      displayName={displayName}
      isUpdating={false}
      onDisplayNameChange={setDisplayName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => onComplete({ action: "save", displayName })}
      onRelocate={() => onComplete({ action: "relocate" })}
      onRebind={() => onComplete({ action: "rebind" })}
      open
      workspaceId={payload.workspaceId}
    />
  );
}

function WorkspaceEntryDetailsRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.entry.details">) {
  return (
    <WorkspaceEntryDetailsSheet
      dialogContentOnly
      entry={payload.entry}
      rootName={payload.rootName}
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  );
}

function CreateWorkspaceEntryRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.entry.create">) {
  const [name, setName] = useState(payload.name);
  return (
    <CreateWorkspaceEntrySheet
      modalName="dialog-workspace-entry-create"
      dialogContentOnly
      entryKind={payload.entryKind}
      name={name}
      parentPath={payload.parentPath}
      isCreating={false}
      open
      onNameChange={setName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => onComplete({ name })}
    />
  );
}

function RenameWorkspaceEntryRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.entry.rename">) {
  const [name, setName] = useState(payload.name);
  return (
    <RenameWorkspaceEntrySheet
      dialogContentOnly
      name={name}
      isRenaming={false}
      open
      onNameChange={setName}
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
      onSubmit={() => onComplete({ name })}
    />
  );
}

function FontPickerRenderer({ payload, onComplete }: DialogRendererProps<"settings.font-picker">) {
  return (
    <FontPicker
      consumer={payload.consumer}
      dialogContentOnly
      open
      onOpenChange={(open) => {
        if (!open) onComplete(null);
      }}
    />
  );
}

function LicensesRenderer() {
  return <LicensesSettingsPage />;
}

function DirectoryPickerRenderer({
  payload,
  onComplete,
}: DialogRendererProps<"workspace.directory-picker">) {
  return (
    <DirectoryPickerHost dialogContentOnly dialogPayload={payload} onDialogComplete={onComplete} />
  );
}

registerDialogRenderer("workspace.details", WorkspaceDetailsRenderer);
registerDialogRenderer("workspace.create", CreateWorkspaceRenderer);
registerDialogRenderer("workspace.edit", EditWorkspaceRenderer);
registerDialogRenderer("workspace.entry.create", CreateWorkspaceEntryRenderer);
registerDialogRenderer("workspace.entry.rename", RenameWorkspaceEntryRenderer);
registerDialogRenderer("workspace.entry.details", WorkspaceEntryDetailsRenderer);
registerDialogRenderer("settings.font-picker", FontPickerRenderer);
registerDialogRenderer("settings.licenses", LicensesRenderer);
registerDialogRenderer("workspace.location", WorkspaceLocationDialogRenderer);
registerDialogRenderer("workspace.directory-picker", DirectoryPickerRenderer);
