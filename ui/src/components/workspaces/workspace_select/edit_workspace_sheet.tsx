import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Dialog,
  NativeList,
  NativeListButtonItem,
  NativeListInputItem,
  NativeListSection,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import { isIos } from "@/api/common";
import { useLayoutMode } from "@/hooks/layout";

const EDIT_WORKSPACE_SNAP_POINTS = ["50%" as const];

type EditWorkspaceSheetProps = {
  displayName: string;
  isUpdating: boolean;
  onDisplayNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
};

export function EditWorkspaceSheet({
  displayName,
  isUpdating,
  onDisplayNameChange,
  onOpenChange,
  onSubmit,
  open,
}: EditWorkspaceSheetProps) {
  const { layoutMode } = useLayoutMode();
  const { width, height } = useWindowDimensions();
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });
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
      <NativeListSection title="基本信息">
        <NativeListInputItem
          title="工作区名称"
          inputProps={{
            autoFocus: true,
            onChangeText: onDisplayNameChange,
            placeholder: "我的笔记",
            textAlign: "right",
            value: displayName,
          }}
        />
      </NativeListSection>
      <NativeListSection>
        <NativeListButtonItem
          disabled={!canSubmit}
          onPress={onSubmit}
          title={isUpdating ? "正在保存…" : "保存"}
        />
      </NativeListSection>
    </NativeList>
  );

  if (layoutMode === "desktop") {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="编辑工作区"
        content={content}
        contentProps={{
          style: {
            width: Math.min(520, width * 0.9),
            maxWidth: width * 0.9,
            height: Math.min(320, height * 0.8),
            padding: 16,
            backgroundColor: appBackgroundColors.sheet,
          },
        }}
      />
    );
  }

  return (
    <NativeSheetStack
      initialRouteName="edit-workspace"
      name="edit-workspace-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: EDIT_WORKSPACE_SNAP_POINTS,
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="edit-workspace" options={{ title: "编辑工作区" }}>
        {() => content}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
  },
});
