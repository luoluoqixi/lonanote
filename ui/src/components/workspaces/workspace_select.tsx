import { useIsFocused } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Input,
  Label,
  Menu,
  MenuItemData,
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListNavigationItem,
  NativeListSection,
  NativeSheetScrollContent,
  NativeSheetStack,
  Select,
  Text,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import {
  type StorageProviderId,
  type WorkspaceListItem,
  workspace,
} from "@/api/commands/workspace";
import { formatUnixSecondsDateTime, isIos, isSystemLocaleCN, os } from "@/api/common";
import { useToast } from "@/hooks/ui";
import { useWorkspaceSession } from "@/hooks/workspace";

type HeaderActionButtonProps = {
  accessibilityLabel: string;
  label: string;
  onPress?: () => void;
};

const MIN_PULL_TO_REFRESH_DURATION_MS = 500;
const CREATE_WORKSPACE_SNAP_POINTS = [40, 60, 90];

const pressActions = {
  selectWorkspacePress: () => {
    console.log("todo");
  },
  sortWorkspacePress: () => {
    console.log("todo");
  },
  openSettingsPress: () => {
    router.push("/settings");
  },
};

const getDefaultNewNoteName = () => {
  return isSystemLocaleCN() ? "我的笔记" : "My Notes";
};

function getStorageProviderLabel(providerId: StorageProviderId): string {
  switch (providerId) {
    case "app-local":
      return "应用内部存储";
    case "desktop-documents":
      return "文稿";
    default:
      return providerId;
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function HeaderActionButton({ accessibilityLabel, label, onPress }: HeaderActionButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        onPress?.();
      }}
      native={isIos()}
      chromeless
      title={label}
    />
  );
}

function CreateWorkspaceSheet({
  onOpenChange,
  open,
  displayName,
  isCreating,
  isLoadingStorageProviders,
  onStorageProviderChange,
  setDisplayName,
  storageProviderError,
  storageProviderIds,
  storageProviderId,
  onSubmit,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  displayName: string;
  isCreating: boolean;
  isLoadingStorageProviders: boolean;
  onStorageProviderChange: (providerId: string | null) => void;
  setDisplayName: (v: string) => void;
  storageProviderError: string | null;
  storageProviderIds: StorageProviderId[];
  storageProviderId: StorageProviderId | null;
  onSubmit: () => void;
}) {
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
            onChange={setDisplayName}
            isCreating={isCreating}
            isLoadingStorageProviders={isLoadingStorageProviders}
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

function CreateWorkspaceSheetContent({
  displayName,
  isCreating,
  isLoadingStorageProviders,
  onChange,
  onStorageProviderChange,
  onSubmit,
  storageProviderError,
  storageProviderIds,
  storageProviderId,
}: {
  displayName: string;
  isCreating: boolean;
  isLoadingStorageProviders: boolean;
  onChange: (value: string) => void;
  onStorageProviderChange: (providerId: string | null) => void;
  onSubmit: () => void;
  storageProviderError: string | null;
  storageProviderIds: StorageProviderId[];
  storageProviderId: StorageProviderId | null;
}) {
  const isFocused = useIsFocused();
  const canSubmit =
    displayName.trim().length > 0 &&
    storageProviderId !== null &&
    !isLoadingStorageProviders &&
    !isCreating;

  return (
    <NativeSheetScrollContent
      bindToNativeSheet={isFocused}
      contentContainerStyle={styles.createSheetContent}
    >
      <Label
        htmlFor="workspace-display-name"
        color="$gray12"
        style={{ paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0 }}
      >
        工作区名称
      </Label>
      <Input
        autoFocus
        id="workspace-display-name"
        onChangeText={onChange}
        placeholder="我的笔记"
        value={displayName}
      />
      {isLoadingStorageProviders ? (
        <Text color="$gray11">正在加载存储位置…</Text>
      ) : storageProviderError ? (
        <Text color="$red10">{storageProviderError}</Text>
      ) : storageProviderIds.length === 0 ? (
        <Text color="$red10">当前设备没有可用的存储位置</Text>
      ) : (
        //     :
        //     storageProviderIds.length === 1 ? (
        // <Text color="$gray11">存储位置：{getStorageProviderLabel(storageProviderIds[0])}</Text>
        //     )
        <>
          <Label htmlFor="workspace-storage-provider" color="$gray12">
            存储位置
          </Label>
          <Select
            aria-label="存储位置"
            id="workspace-storage-provider"
            native
            onValueChange={onStorageProviderChange}
            options={storageProviderIds.map((providerId) => ({
              label: getStorageProviderLabel(providerId),
              value: providerId,
            }))}
            value={storageProviderId ?? undefined}
          />
        </>
      )}
      <Button
        disabled={!canSubmit}
        theme="accent"
        title={isCreating ? "正在创建…" : "确定"}
        onPress={onSubmit}
      />
    </NativeSheetScrollContent>
  );
}

function WorkspaceSelectStatus({ message }: { message: string }) {
  return (
    <View style={styles.status}>
      <Text color="$gray11" fontSize="$4">
        {message}
      </Text>
    </View>
  );
}

async function waitForMinimumDuration(startedAt: number, minimumDurationMs: number) {
  const remainingDuration = minimumDurationMs - (Date.now() - startedAt);
  if (remainingDuration <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, remainingDuration);
  });
}

export function WorkspaceSelect() {
  const { toast } = useToast();
  const { setCurrentWorkspaceId } = useWorkspaceSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreateWorkspaceSheetOpen, setIsCreateWorkspaceSheetOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [storageProviderIds, setStorageProviderIds] = useState<StorageProviderId[]>([]);
  const [storageProviderId, setStorageProviderId] = useState<StorageProviderId | null>(null);
  const [storageProviderError, setStorageProviderError] = useState<string | null>(null);
  const [isLoadingStorageProviders, setIsLoadingStorageProviders] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const requestIdRef = useRef(0);
  const storageProviderRequestIdRef = useRef(0);
  const usesNativeIosHeader = os() === "ios";
  const tracksNavigationBarScrollEdge = usesNativeIosHeader;

  const refreshWorkspaces = useCallback(async (minimumDurationMs = 0) => {
    const requestId = ++requestIdRef.current;
    const startedAt = Date.now();

    try {
      const records = await workspace.list();
      await waitForMinimumDuration(startedAt, minimumDurationMs);

      if (requestId === requestIdRef.current) {
        setWorkspaces(records);
        setHasError(false);
      }
    } catch (nextError: unknown) {
      await waitForMinimumDuration(startedAt, minimumDurationMs);

      if (requestId === requestIdRef.current) {
        console.error("[workspace-select] load workspaces failed", nextError);
        setHasError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handlePullToRefresh = useCallback(
    () => refreshWorkspaces(MIN_PULL_TO_REFRESH_DURATION_MS),
    [refreshWorkspaces],
  );
  const loadManagedStorageProviders = useCallback(async () => {
    const requestId = ++storageProviderRequestIdRef.current;
    setIsLoadingStorageProviders(true);
    setStorageProviderError(null);

    try {
      const nextStorageProviderIds = await workspace.listManagedStorageProviderIds();

      if (requestId === storageProviderRequestIdRef.current) {
        setStorageProviderIds(nextStorageProviderIds);
        setStorageProviderId((currentProviderId) =>
          currentProviderId && nextStorageProviderIds.includes(currentProviderId)
            ? currentProviderId
            : (nextStorageProviderIds[0] ?? null),
        );
      }
    } catch (error) {
      console.error("[workspace-select] load managed storage providers failed", error);

      if (requestId === storageProviderRequestIdRef.current) {
        setStorageProviderIds([]);
        setStorageProviderId(null);
        setStorageProviderError(getErrorMessage(error, "无法加载存储位置"));
      }
    } finally {
      if (requestId === storageProviderRequestIdRef.current) {
        setIsLoadingStorageProviders(false);
      }
    }
  }, []);
  const openCreateWorkspaceSheet = useCallback(() => {
    setDisplayName(getDefaultNewNoteName());
    setStorageProviderIds([]);
    setStorageProviderId(null);
    setStorageProviderError(null);
    setIsCreateWorkspaceSheetOpen(true);
    void loadManagedStorageProviders();
  }, [loadManagedStorageProviders]);
  const createWorkspace = useCallback(async () => {
    if (isCreatingWorkspace) {
      return;
    }

    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      toast.error("请输入工作区名称");
      return;
    }
    if (!storageProviderId) {
      toast.error("请选择存储位置");
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const createdWorkspace = await workspace.createManaged(storageProviderId, nextDisplayName);
      setCurrentWorkspaceId(createdWorkspace.id);
      setIsCreateWorkspaceSheetOpen(false);
      void refreshWorkspaces();
      toast.success(`已创建工作区“${createdWorkspace.displayName}”`);
    } catch (error) {
      console.error("[workspace-select] create workspace failed", error);
      toast.error(getErrorMessage(error, "创建工作区失败"));
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [
    displayName,
    isCreatingWorkspace,
    refreshWorkspaces,
    setCurrentWorkspaceId,
    storageProviderId,
    toast,
  ]);
  const headerMenuItems = useMemo<MenuItemData[]>(
    () => [
      {
        label: "选择工作区",
        value: "select-workspace",
        onPress: pressActions.selectWorkspacePress,
      },
      {
        label: "创建工作区",
        value: "create-workspace",
        onPress: openCreateWorkspaceSheet,
      },
      {
        label: "排序方式",
        value: "sort-workspace",
        onPress: pressActions.sortWorkspacePress,
      },
      {
        label: "设置",
        value: "settings",
        onPress: pressActions.openSettingsPress,
      },
    ],
    [openCreateWorkspaceSheet],
  );

  useEffect(() => {
    void refreshWorkspaces();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshWorkspaces]);

  const statusMessage = isLoading
    ? "正在加载工作区"
    : hasError && workspaces.length === 0
      ? "工作区加载失败"
      : workspaces.length === 0
        ? "暂无工作区"
        : null;
  const showCreateWorkspaceButton = !isLoading && !hasError;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Menu
              trigger={<HeaderActionButton accessibilityLabel="右侧操作" label="•••" />}
              items={headerMenuItems}
              nativeHaptics
            />
          ),
        }}
      />
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
        contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
        onRefresh={handlePullToRefresh}
        style={styles.list}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        <NativeListSection title="选择工作区">
          {statusMessage ? (
            <NativeListCustomItem paddingVertical={0}>
              <WorkspaceSelectStatus message={statusMessage} />
            </NativeListCustomItem>
          ) : (
            workspaces.map((workspaceItem) => (
              <NativeListNavigationItem
                icon={
                  <Text color="$color10" fontSize="$7">
                    ▣
                  </Text>
                }
                iconSize={24}
                iconSlotWidth={28}
                key={workspaceItem.id}
                nativeScrollId={workspaceItem.id}
                onPress={() => {}}
                sfSymbol="folder.fill"
                title={workspaceItem.displayName}
                subtitle={formatUnixSecondsDateTime(workspaceItem.createdAt) ?? "创建时间未知"}
                titleFontSize={16}
              />
            ))
          )}
          {showCreateWorkspaceButton ? (
            <NativeListButtonItem onPress={openCreateWorkspaceSheet} title="创建工作区" />
          ) : null}
        </NativeListSection>
      </NativeList>
      <CreateWorkspaceSheet
        onOpenChange={setIsCreateWorkspaceSheetOpen}
        open={isCreateWorkspaceSheetOpen}
        displayName={displayName}
        isCreating={isCreatingWorkspace}
        isLoadingStorageProviders={isLoadingStorageProviders}
        onStorageProviderChange={setStorageProviderId}
        onSubmit={() => {
          void createWorkspace();
        }}
        setDisplayName={setDisplayName}
        storageProviderError={storageProviderError}
        storageProviderIds={storageProviderIds}
        storageProviderId={storageProviderId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  createSheetContent: {
    gap: 12,
    padding: 20,
  },
  headerAction: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    minWidth: 36,
    paddingHorizontal: 6,
  },
  list: {
    flex: 1,
  },
  status: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    width: "100%",
  },
});
