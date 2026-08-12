import { StyleSheet } from "react-native";
import {
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

const CREATE_WORKSPACE_SNAP_POINTS = [88];

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
  const usesNativeIosScrollEdgeHeader = isIos();
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
            <Text color="$gray11">正在加载存储位置…</Text>
          </NativeListCustomItem>
        ) : storageProviderError ? (
          <NativeListCustomItem>
            <Text color="$red10">{storageProviderError}</Text>
          </NativeListCustomItem>
        ) : storageProviderIds.length === 0 ? (
          <NativeListCustomItem>
            <Text color="$red10">当前设备没有可用的存储位置</Text>
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
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });

  return (
    <NativeSheetStack
      initialRouteName="create-workspace"
      name="create-workspace-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: CREATE_WORKSPACE_SNAP_POINTS,
        snapPointsMode: "percent",
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="create-workspace" options={{ title: "创建工作区" }}>
        {() => (
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
        )}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
