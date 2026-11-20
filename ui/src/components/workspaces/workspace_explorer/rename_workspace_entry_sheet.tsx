import { AdaptiveModal } from "@/components/common/adaptive_modal";

import {
  RenameWorkspaceEntryContent,
  type RenameWorkspaceEntrySheetProps,
} from "./rename_workspace_entry_content";

export function RenameWorkspaceEntrySheet(props: RenameWorkspaceEntrySheetProps) {
  const { dialogContentOnly, name, onNativeResult, onOpenChange, open } = props;
  if (dialogContentOnly) return <RenameWorkspaceEntryContent {...props} />;
  return (
    <AdaptiveModal
      name="rename-workspace-entry-sheet"
      nativeDialog={{
        id: "workspace.entry.rename",
        payload: { name },
        title: "编辑名称",
        width: 520,
        height: 320,
      }}
      onNativeResult={onNativeResult}
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
