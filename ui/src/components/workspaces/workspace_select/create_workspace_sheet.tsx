import { StyleSheet } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
} from "rn-ui-kit";

import { isIos } from "@/api/common";
import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { useLayoutMode } from "@/hooks/layout";

import {
  type WorkspaceStorageTargetForm,
  renderWorkspaceStorageFields,
} from "./workspace_storage_fields";

type CreateWorkspaceSheetProps = {
  displayName: string;
  isCreating: boolean;
  onDisplayNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  target: WorkspaceStorageTargetForm;
};

export function CreateWorkspaceSheet({
  displayName,
  isCreating,
  onDisplayNameChange,
  onOpenChange,
  onSubmit,
  open,
  target,
}: CreateWorkspaceSheetProps) {
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const usesNativeIosScrollEdgeHeader = isIos() && layoutMode !== "desktop";
  const canSubmit =
    displayName.trim().length > 0 &&
    target.providerId !== null &&
    !target.isLoading &&
    !target.isChoosing &&
    !isCreating &&
    (target.isManaged || target.externalBinding !== null);

  return (
    <AdaptiveModal
      name="create-workspace-sheet"
      screenName="create-workspace"
      title="创建工作区"
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isCreating && !target.isChoosing) onOpenChange(nextOpen);
      }}
      dialogSize={{ width: 560, height: 460 }}
      sheetProps={{ snapPoints: ["88%"] }}
    >
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosScrollEdgeHeader ? true : undefined}
        contentInsetAdjustmentBehavior={usesNativeIosScrollEdgeHeader ? "automatic" : undefined}
        dismissKeyboardOnTap
        style={styles.list}
        tracksNavigationBarScrollEdge
      >
        <NativeListSection titleFontSize={desktop ? 12 : undefined} title="基本信息">
          <NativeListInputItem
            titleFontSize={desktop ? 13 : undefined}
            valueFontSize={desktop ? 13 : undefined}
            title="工作区名称"
            inputProps={{
              style: desktop ? { fontSize: 13 } : undefined,
              autoFocus: true,
              editable: !isCreating,
              onChangeText: onDisplayNameChange,
              placeholder: "我的笔记",
              textAlign: "right",
              value: displayName,
            }}
          />
          {renderWorkspaceStorageFields({ desktop, target, disabled: isCreating })}
        </NativeListSection>
        <NativeListSection>
          <NativeListButtonItem
            titleFontSize={desktop ? 13 : undefined}
            valueFontSize={desktop ? 13 : undefined}
            disabled={!canSubmit}
            onPress={onSubmit}
            title={isCreating ? "正在创建…" : "创建工作区"}
          />
        </NativeListSection>
      </NativeList>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({ list: { flex: 1, minHeight: 0 } });
