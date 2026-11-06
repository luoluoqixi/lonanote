import { useSyncExternalStore } from "react";

import { workspaceIndex } from "@/api/commands/workspace";
import {
  type DirectoryPickerOptions,
  createDirectoryPickerModel,
  createIndexedDirectoryLoader,
} from "@/components/workspaces/directory_picker/directory_picker_model";
import { workspaceSessionStore } from "@/stores/workspace/workspace_session_store";

export const workspaceDirectoryPicker = createDirectoryPickerModel(
  createIndexedDirectoryLoader(workspaceIndex.getDirectory),
);

workspaceSessionStore.subscribe((state, previous) => {
  if (state.currentWorkspaceId !== previous.currentWorkspaceId) workspaceDirectoryPicker.cancel();
});

export function selectWorkspaceDirectory(options: DirectoryPickerOptions) {
  if (workspaceSessionStore.getCurrentWorkspaceId() !== options.workspaceId)
    return Promise.resolve(null);
  return workspaceDirectoryPicker.request(options);
}

export function useWorkspaceDirectoryPicker() {
  return useSyncExternalStore(
    workspaceDirectoryPicker.subscribe,
    workspaceDirectoryPicker.getSnapshot,
    workspaceDirectoryPicker.getSnapshot,
  );
}
