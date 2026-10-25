import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Dialog,
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListInputItem,
  NativeListSection,
  NativeListSelectItem,
  NativeSheetStack,
  Text,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import type { StorageProviderId } from "@/api/commands/workspace";
import { isIos } from "@/api/common";
import { useLayoutMode } from "@/hooks/layout";

const CREATE_WORKSPACE_SNAP_POINTS = ["88%" as const];

type CreateWorkspaceSheetProps = {
  displayName: string;
  isCreating: boolean;
  isLoadingStorageProviders: boolean;
  onDisplayNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onStorageProviderChange: (providerId: string | null) => void;
  onSubmit: () => void;
  open: boolean;
  storageProviderError: string | null;
  storageProviderId: StorageProviderId | null;
  storageProviderIds: StorageProviderId[];
};

type CreateWorkspaceSheetContentProps = Pick<
  CreateWorkspaceSheetProps,
  | "displayName"
  | "isCreating"
  | "isLoadingStorageProviders"
  | "onDisplayNameChange"
  | "onStorageProviderChange"
  | "onSubmit"
  | "storageProviderError"
  | "storageProviderId"
  | "storageProviderIds"
>;

function getStorageProviderLabel(providerId: StorageProviderId): string {
  switch (providerId) {
    case "app-local":
      return isIos() ? "我的iPhone" : "应用内部存储";
    case "desktop-documents":
      return "文稿";
    default:
      return providerId;
  }
}

function CreateWorkspaceSheetContent({
  displayName,
  isCreating,
  isLoadingStorageProviders,
  onDisplayNameChange,
  onStorageProviderChange,
  onSubmit,
  storageProviderError,
  storageProviderIds,
  storageProviderId,
}: CreateWorkspaceSheetContentProps) {
  const { layoutMode } = useLayoutMode();
  const usesNativeIosScrollEdgeHeader = isIos() && layoutMode !== "desktop";
  const canSubmit =
    displayName.trim().length > 0 &&
    storageProviderId !== null &&
    !isLoadingStorageProviders &&
    !isCreating;

  return (
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
        {isLoadingStorageProviders ? (
          <NativeListCustomItem>
            <Text className="text-muted-foreground">正在加载存储位置…</Text>
          </NativeListCustomItem>
        ) : storageProviderError ? (
          <NativeListCustomItem>
            <Text className="text-destructive">{storageProviderError}</Text>
          </NativeListCustomItem>
        ) : storageProviderIds.length === 0 ? (
          <NativeListCustomItem>
            <Text className="text-destructive">当前设备没有可用的存储位置</Text>
          </NativeListCustomItem>
        ) : (
          <NativeListSelectItem
            title="存储位置"
            selectProps={{
              onValueChange: onStorageProviderChange,
              options: storageProviderIds.map((providerId) => ({
                label: getStorageProviderLabel(providerId),
                value: providerId,
              })),
              value: storageProviderId ?? undefined,
            }}
          />
        )}
      </NativeListSection>
      <NativeListSection>
        <NativeListButtonItem
          disabled={!canSubmit}
          onPress={onSubmit}
          title={isCreating ? "正在创建…" : "创建工作区"}
        />
      </NativeListSection>
    </NativeList>
  );
}

export function CreateWorkspaceSheet({
  displayName,
  isCreating,
  isLoadingStorageProviders,
  onDisplayNameChange,
  onOpenChange,
  onStorageProviderChange,
  onSubmit,
  open,
  storageProviderError,
  storageProviderIds,
  storageProviderId,
}: CreateWorkspaceSheetProps) {
  const { layoutMode } = useLayoutMode();
  const { width, height } = useWindowDimensions();
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });

  const content = (
    <CreateWorkspaceSheetContent
      displayName={displayName}
      isCreating={isCreating}
      isLoadingStorageProviders={isLoadingStorageProviders}
      onDisplayNameChange={onDisplayNameChange}
      onStorageProviderChange={onStorageProviderChange}
      onSubmit={onSubmit}
      storageProviderError={storageProviderError}
      storageProviderIds={storageProviderIds}
      storageProviderId={storageProviderId}
    />
  );

  if (layoutMode === "desktop") {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="创建工作区"
        content={content}
        contentProps={{
          style: {
            width: Math.min(560, width * 0.9),
            maxWidth: width * 0.9,
            height: Math.min(400, height * 0.8),
            padding: 16,
            backgroundColor: appBackgroundColors.sheet,
          },
        }}
      />
    );
  }

  return (
    <NativeSheetStack
      initialRouteName="create-workspace"
      name="create-workspace-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: CREATE_WORKSPACE_SNAP_POINTS,
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="create-workspace" options={{ title: "创建工作区" }}>
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
