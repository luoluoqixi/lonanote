import { ArrowDownUp, FolderOpen, FolderPlus, Settings } from "@tamagui/lucide-icons-2";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Menu,
  MenuItemData,
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListInputItem,
  NativeListNavigationItem,
  NativeListSection,
  NativeListSelectItem,
  NativeSheetStack,
  Select,
  type SelectHandle,
  type SelectItemGroupData,
  Text,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
  useMenuTriggerState,
} from "rn-ui-kit";

import {
  type StorageProviderId,
  type WorkspaceListItem,
  workspace,
} from "@/api/commands/workspace";
import { formatUnixSecondsDateTime, isIos, isSystemLocaleCN, os } from "@/api/common";
import { useToast } from "@/hooks/ui";
import { useWorkspaceSession, useWorkspaceState } from "@/hooks/workspace";

type HeaderActionButtonProps = {
  accessibilityLabel: string;
  label: string;
  onPress?: () => void;
  opacity?: number;
};

const MIN_PULL_TO_REFRESH_DURATION_MS = 500;
const CREATE_WORKSPACE_SNAP_POINTS = [88];
type WorkspaceSortField = "last-opened" | "created-at" | "title";
type WorkspaceSortDirection = "ascending" | "descending";
type WorkspaceSortValue =
  | "last-opened-desc"
  | "last-opened-asc"
  | "created-at-desc"
  | "created-at-asc"
  | "title-asc"
  | "title-desc";

const DEFAULT_WORKSPACE_SORT_VALUE: WorkspaceSortValue = "last-opened-desc";
const WORKSPACE_SORT_ITEM_GROUPS: SelectItemGroupData[] = [
  {
    items: [
      { label: "最近打开（默认）", value: "last-opened-desc" },
      { label: "最早打开", value: "last-opened-asc" },
    ],
    key: "last-opened",
  },
  {
    items: [
      { label: "最近创建", value: "created-at-desc" },
      { label: "最早创建", value: "created-at-asc" },
    ],
    key: "created-at",
  },
  {
    items: [
      { label: "标题：A–Z", value: "title-asc" },
      { label: "标题：Z–A", value: "title-desc" },
    ],
    key: "title",
  },
];

const getDefaultNewNoteName = () => {
  return isSystemLocaleCN() ? "我的笔记" : "My Notes";
};

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

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function HeaderActionButton({
  accessibilityLabel,
  label,
  onPress,
  opacity,
}: HeaderActionButtonProps) {
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
      circular
      opacity={opacity}
      title={label}
    />
  );
}

function HeaderMenuActionButton() {
  const { isActive } = useMenuTriggerState();

  return (
    <HeaderActionButton accessibilityLabel="右侧操作" label="•••" opacity={isActive ? 0.4 : 1} />
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
  const usesNativeIosScrollEdgeHeader = isIos();
  const tracksScrollEdgeHeader = true;
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
      tracksNavigationBarScrollEdge={tracksScrollEdgeHeader}
    >
      <NativeListSection title="基本信息">
        <NativeListInputItem
          title="工作区名称"
          inputProps={{
            autoFocus: true,
            onChangeText: onChange,
            placeholder: "我的笔记",
            value: displayName,
            textAlign: "right",
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

function sortWorkspaces(
  workspaces: WorkspaceListItem[],
  sortValue: WorkspaceSortValue,
): WorkspaceListItem[] {
  const { sortDirection, sortField } = getWorkspaceSortConfig(sortValue);

  return [...workspaces].sort((left, right) => {
    if (sortField === "title") {
      const comparison = left.displayName.localeCompare(right.displayName);
      return sortDirection === "ascending" ? comparison : -comparison;
    }

    const dateField = sortField === "last-opened" ? "lastOpenedAt" : "createdAt";
    const leftDate = left[dateField];
    const rightDate = right[dateField];

    if (leftDate == null || rightDate == null) {
      if (leftDate == null && rightDate == null) {
        return left.displayName.localeCompare(right.displayName);
      }

      return leftDate == null ? 1 : -1;
    }

    const comparison = leftDate - rightDate;
    return sortDirection === "ascending" ? comparison : -comparison;
  });
}

function getWorkspaceSortConfig(sortValue: WorkspaceSortValue): {
  sortField: WorkspaceSortField;
  sortDirection: WorkspaceSortDirection;
} {
  switch (sortValue) {
    case "last-opened-desc":
      return { sortField: "last-opened", sortDirection: "descending" };
    case "last-opened-asc":
      return { sortField: "last-opened", sortDirection: "ascending" };
    case "created-at-desc":
      return { sortField: "created-at", sortDirection: "descending" };
    case "created-at-asc":
      return { sortField: "created-at", sortDirection: "ascending" };
    case "title-asc":
      return { sortField: "title", sortDirection: "ascending" };
    case "title-desc":
      return { sortField: "title", sortDirection: "descending" };
  }
}

function isWorkspaceSortValue(value: string | null): value is WorkspaceSortValue {
  return (
    value === "last-opened-desc" ||
    value === "last-opened-asc" ||
    value === "created-at-desc" ||
    value === "created-at-asc" ||
    value === "title-asc" ||
    value === "title-desc"
  );
}

export function WorkspaceSelect() {
  const { toast } = useToast();
  const { setCurrentWorkspaceId } = useWorkspaceSession();
  const { open: openWorkspace } = useWorkspaceState(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [workspaceSortValue, setWorkspaceSortValue] = useState<WorkspaceSortValue>(
    DEFAULT_WORKSPACE_SORT_VALUE,
  );
  const [isWorkspaceSortSelectOpen, setIsWorkspaceSortSelectOpen] = useState(false);
  const [isWorkspaceSelectionMode, setIsWorkspaceSelectionMode] = useState(false);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreateWorkspaceSheetOpen, setIsCreateWorkspaceSheetOpen] = useState(false);
  const workspaceSortSelectRef = useRef<SelectHandle>(null);
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
        icon: <FolderOpen color="$color10" size={14} />,
        iconProps: {
          androidIconName: "ic_menu_myplaces",
          ios: { name: "folder" },
        },
        label: "选择工作区",
        value: "select-workspace",
        onPress: () => {
          setIsWorkspaceSelectionMode((currentValue) => !currentValue);
          setSelectedWorkspaceIds([]);
        },
      },
      {
        icon: <FolderPlus color="$color10" size={14} />,
        iconProps: {
          androidIconName: "ic_menu_add",
          ios: { name: "folder.badge.plus" },
        },
        label: "创建工作区",
        value: "create-workspace",
        onPress: openCreateWorkspaceSheet,
      },
      {
        separator: true,
        value: "separator-01",
      },
      {
        icon: <ArrowDownUp color="$color10" size={14} />,
        iconProps: {
          androidIconName: "ic_menu_sort_by_size",
          ios: { name: "arrow.up.arrow.down" },
        },
        label: "排序方式",
        onPress: () => workspaceSortSelectRef.current?.open(),
        value: "sort-workspaces",
      },
      {
        separator: true,
        value: "separator-02",
      },
      {
        icon: <Settings color="$color10" size={14} />,
        iconProps: {
          androidIconName: "ic_menu_preferences",
          ios: { name: "gearshape" },
        },
        label: "设置",
        value: "settings",
        onPress: () => {
          router.push("/settings");
        },
      },
    ],
    [openCreateWorkspaceSheet],
  );

  const sortedWorkspaces = useMemo(
    () => sortWorkspaces(workspaces, workspaceSortValue),
    [workspaceSortValue, workspaces],
  );
  const handleWorkspacePress = useCallback(
    async (workspaceId: string) => {
      if (isOpeningWorkspace) {
        return;
      }

      setIsOpeningWorkspace(true);

      try {
        await openWorkspace(workspaceId);
        setCurrentWorkspaceId(workspaceId);
        void refreshWorkspaces();
      } catch (error) {
        console.error("[workspace-select] open workspace failed", error);
        toast.error(getErrorMessage(error, "打开工作区失败"));
      } finally {
        setIsOpeningWorkspace(false);
      }
    },
    [isOpeningWorkspace, openWorkspace, refreshWorkspaces, setCurrentWorkspaceId, toast],
  );
  const handleSelectedWorkspaceIdsChange = useCallback(
    (nextSelectedIds: Array<string | number>) => {
      setSelectedWorkspaceIds(nextSelectedIds.filter((id): id is string => typeof id === "string"));
    },
    [],
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
            <Menu trigger={HeaderMenuActionButton} items={headerMenuItems} nativeHaptics />
          ),
        }}
      />
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
        contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
        editMode={isWorkspaceSelectionMode}
        onRefresh={handlePullToRefresh}
        onSelectedIdsChange={handleSelectedWorkspaceIdsChange}
        selectedIds={selectedWorkspaceIds}
        style={styles.list}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        <NativeListSection title="选择工作区">
          {statusMessage ? (
            <NativeListCustomItem paddingVertical={0}>
              <WorkspaceSelectStatus message={statusMessage} />
            </NativeListCustomItem>
          ) : (
            sortedWorkspaces.map((workspaceItem) => (
              <NativeListNavigationItem
                disabled={isOpeningWorkspace}
                icon={
                  <Text color="$color10" fontSize="$7">
                    ▣
                  </Text>
                }
                iconSize={24}
                iconSlotWidth={28}
                key={workspaceItem.id}
                nativeScrollId={workspaceItem.id}
                onPress={() => {
                  void handleWorkspacePress(workspaceItem.id);
                }}
                sfSymbol="folder.fill"
                title={workspaceItem.displayName}
                subtitle={formatUnixSecondsDateTime(workspaceItem.createdAt) ?? "创建时间未知"}
                titleFontSize={16}
              />
            ))
          )}
          {showCreateWorkspaceButton ? (
            <NativeListButtonItem
              selectionDisabled
              onPress={openCreateWorkspaceSheet}
              title="创建工作区"
            />
          ) : null}
        </NativeListSection>
      </NativeList>
      <Select
        ref={workspaceSortSelectRef}
        itemGroups={WORKSPACE_SORT_ITEM_GROUPS}
        native="native-sheet"
        onOpenChange={setIsWorkspaceSortSelectOpen}
        onValueChange={(nextValue) => {
          if (!isWorkspaceSortValue(nextValue)) {
            return;
          }

          setWorkspaceSortValue(nextValue);
          setIsWorkspaceSortSelectOpen(false);
        }}
        open={isWorkspaceSortSelectOpen}
        placeholder="排序方式"
        triggerProps={{ display: "none" }}
        value={workspaceSortValue}
      />
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
