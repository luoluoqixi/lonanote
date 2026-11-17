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
  dialogContentOnly?: boolean;
  displayName: string;
  isCreating: boolean;
  onDisplayNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onNativeResult?: (result: unknown) => void;
  onSubmit: () => void;
  open: boolean;
  target: WorkspaceStorageTargetForm;
};

export function CreateWorkspaceSheet({
  dialogContentOnly = false,
  displayName,
  isCreating,
  onDisplayNameChange,
  onOpenChange,
  onNativeResult,
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

  const content = (
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
  );
  if (dialogContentOnly) return content;

  return (
    <AdaptiveModal
      name="create-workspace-sheet"
      nativeDialog={{
        id: "workspace.create",
        payload: { displayName },
        title: "创建工作区",
        width: 560,
        height: 460,
      }}
      onNativeResult={onNativeResult}
      screenName="create-workspace"
      title="创建工作区"
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isCreating && !target.isChoosing) onOpenChange(nextOpen);
      }}
      dialogSize={{ width: 560, height: 460 }}
      sheetProps={{ snapPoints: ["88%"] }}
    >
      {content}
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({ list: { flex: 1, minHeight: 0 } });
