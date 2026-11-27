import { AdaptiveModal } from "@/components/common/adaptive_modal";

import {
  RenameWorkspaceEntryContent,
  type RenameWorkspaceEntrySheetProps,
} from "./rename_workspace_entry_content";

export function RenameWorkspaceEntrySheet(props: RenameWorkspaceEntrySheetProps) {
  const { onOpenChange, open } = props;
  return (
    <AdaptiveModal
      name="rename-workspace-entry-sheet"
      screenName="rename-entry"
      title="编辑名称"
      onOpenChange={onOpenChange}
      open={open}
      dialogSize={{ width: 520, height: 320 }}
      sheetProps={{ snapPoints: ["62%"] }}
    >
      <RenameWorkspaceEntryContent {...props} />
    </AdaptiveModal>
  );
}
