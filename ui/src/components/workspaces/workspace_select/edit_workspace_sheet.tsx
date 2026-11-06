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

const EDIT_WORKSPACE_SNAP_POINTS = ["50%" as const];

type EditWorkspaceSheetProps = {
  displayName: string;
  isUpdating: boolean;
  onDisplayNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onRelocate: () => void;
  onRebind: () => void;
  open: boolean;
};

export function EditWorkspaceSheet({
  displayName,
  isUpdating,
  onDisplayNameChange,
  onOpenChange,
  onSubmit,
  onRelocate,
  onRebind,
  open,
}: EditWorkspaceSheetProps) {
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const usesNativeIosScrollEdgeHeader = isIos() && layoutMode !== "desktop";
  const canSubmit = displayName.trim().length > 0 && !isUpdating;

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
            onChangeText: onDisplayNameChange,
            placeholder: "我的笔记",
            textAlign: "right",
            value: displayName,
          }}
        />
      </NativeListSection>
      <NativeListSection titleFontSize={desktop ? 12 : undefined} title="文件夹">
        <NativeListButtonItem
          titleFontSize={desktop ? 13 : undefined}
          valueFontSize={desktop ? 13 : undefined}
          disabled={isUpdating}
          title="更改存储位置…"
          onPress={onRelocate}
        />
        <NativeListButtonItem
          titleFontSize={desktop ? 13 : undefined}
          valueFontSize={desktop ? 13 : undefined}
          disabled={isUpdating}
          title="重新定位工作区…"
          onPress={onRebind}
        />
      </NativeListSection>
      <NativeListSection>
        <NativeListButtonItem
          titleFontSize={desktop ? 13 : undefined}
          valueFontSize={desktop ? 13 : undefined}
          disabled={!canSubmit}
          onPress={onSubmit}
          title={isUpdating ? "正在保存…" : "保存"}
        />
      </NativeListSection>
    </NativeList>
  );

  return (
    <AdaptiveModal
      name="edit-workspace-sheet"
      screenName="edit-workspace"
      title="编辑工作区"
      open={open}
      onOpenChange={onOpenChange}
      dialogSize={{ width: 520, height: 460 }}
      sheetProps={{
        snapPoints: EDIT_WORKSPACE_SNAP_POINTS,
      }}
    >
      {content}
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
  },
});
