import { StyleSheet, View } from "react-native";
import {
  Button,
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
  Text,
} from "rn-ui-kit";

import { isIos } from "@/api/common";
import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { useLayoutMode } from "@/hooks/layout";

const EDIT_WORKSPACE_SNAP_POINTS = ["50%" as const];

type EditWorkspaceSheetProps = {
  dialogContentOnly?: boolean;
  displayName: string;
  isUpdating: boolean;
  onDisplayNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onNativeResult?: (result: unknown) => void;
  onSubmit: () => void;
  onRelocate: () => void;
  onRebind: () => void;
  open: boolean;
  workspaceId?: string;
};

export function EditWorkspaceSheet({
  dialogContentOnly = false,
  displayName,
  isUpdating,
  onDisplayNameChange,
  onOpenChange,
  onNativeResult,
  onSubmit,
  onRelocate,
  onRebind,
  open,
  workspaceId,
}: EditWorkspaceSheetProps) {
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const usesNativeIosScrollEdgeHeader = isIos() && layoutMode !== "desktop";
  const canSubmit = displayName.trim().length > 0 && !isUpdating;

  const content = (
    <View style={styles.list}>
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
        {!desktop ? (
          <NativeListSection>
            <NativeListButtonItem
              titleFontSize={desktop ? 13 : undefined}
              valueFontSize={desktop ? 13 : undefined}
              disabled={!canSubmit}
              onPress={onSubmit}
              title={isUpdating ? "正在保存…" : "保存"}
            />
          </NativeListSection>
        ) : null}
      </NativeList>
      {desktop ? (
        <View style={[styles.actions, dialogContentOnly ? styles.windowActions : undefined]}>
          <Button
            size="sm"
            variant="outline"
            disabled={isUpdating}
            onPress={() => onOpenChange(false)}
          >
            <Text>取消</Text>
          </Button>
          <Button size="sm" disabled={!canSubmit} onPress={onSubmit}>
            <Text>{isUpdating ? "正在保存…" : "保存"}</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );

  if (dialogContentOnly) return content;

  return (
    <AdaptiveModal
      name="edit-workspace-sheet"
      nativeDialog={
        workspaceId
          ? {
              id: "workspace.edit",
              payload: { workspaceId, displayName },
              title: "编辑工作区",
              width: 520,
              height: 460,
            }
          : undefined
      }
      onNativeResult={onNativeResult}
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
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 12 },
  windowActions: { paddingHorizontal: 16, paddingBottom: 16 },
  list: {
    flex: 1,
    minHeight: 0,
  },
});
