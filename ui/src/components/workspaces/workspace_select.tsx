import { ArrowDownUp, CircleCheck, FolderPlus, Settings } from "@tamagui/lucide-icons-2";
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
  confirmNative,
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
  circular?: boolean;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  opacity?: number;
};

const MIN_PULL_TO_REFRESH_DURATION_MS = 500;
const CREATE_WORKSPACE_SNAP_POINTS = [88];
const EDIT_WORKSPACE_SNAP_POINTS = [50];
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
  circular = true,
  disabled,
  label,
  onPress,
  opacity,
}: HeaderActionButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        onPress?.();
      }}
      native={isIos()}
      chromeless
      circular={circular}
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

function EditWorkspaceSheet({
  displayName,
  isUpdating,
  onChange,
  onOpenChange,
  onSubmit,
  open,
}: {
  displayName: string;
  isUpdating: boolean;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
}) {
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });
  const usesNativeIosScrollEdgeHeader = isIos();
  const canSubmit = displayName.trim().length > 0 && !isUpdating;

  return (
    <NativeSheetStack
      initialRouteName="edit-workspace"
      name="edit-workspace-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: EDIT_WORKSPACE_SNAP_POINTS,
        snapPointsMode: "percent",
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="edit-workspace" options={{ title: "编辑工作区" }}>
        {() => (
          <NativeList
            automaticallyAdjustsScrollIndicatorInsets={
              usesNativeIosScrollEdgeHeader ? true : undefined
            }
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
                  onChangeText: onChange,
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
        )}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
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

function getWorkspaceSubtitle(
  workspaceItem: WorkspaceListItem,
  sortValue: WorkspaceSortValue,
): string {
  const { sortField } = getWorkspaceSortConfig(sortValue);
  const timestamp =
    sortField === "created-at" ? workspaceItem.createdAt : workspaceItem.lastOpenedAt;
  const fallbackMessage = sortField === "created-at" ? "创建时间未知" : "打开时间未知";

  return formatUnixSecondsDateTime(timestamp) ?? fallbackMessage;
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
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceSession();
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
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceListItem | null>(null);
  const [editedWorkspaceName, setEditedWorkspaceName] = useState("");
  const [isEditWorkspaceSheetOpen, setIsEditWorkspaceSheetOpen] = useState(false);
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
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
  const openEditWorkspaceSheet = useCallback((workspaceItem: WorkspaceListItem) => {
    setEditingWorkspace(workspaceItem);
    setEditedWorkspaceName(workspaceItem.displayName);
    setIsEditWorkspaceSheetOpen(true);
  }, []);
  const handleEditWorkspaceSheetOpenChange = useCallback((open: boolean) => {
    setIsEditWorkspaceSheetOpen(open);

    if (!open) {
      setEditingWorkspace(null);
      setEditedWorkspaceName("");
    }
  }, []);
  const updateWorkspace = useCallback(async () => {
    if (!editingWorkspace || isUpdatingWorkspace) {
      return;
    }

    const nextDisplayName = editedWorkspaceName.trim();
    if (!nextDisplayName) {
      toast.error("请输入工作区名称");
      return;
    }

    setIsUpdatingWorkspace(true);
    let openedForUpdate = false;

    try {
      const isWorkspaceOpen = await workspace.isOpen(editingWorkspace.id);
      if (!isWorkspaceOpen) {
        await workspace.open(editingWorkspace.id);
        openedForUpdate = true;
      }

      const updatedWorkspace = await workspace.updateDisplayName(
        editingWorkspace.id,
        nextDisplayName,
      );
      handleEditWorkspaceSheetOpenChange(false);
      await refreshWorkspaces();
      toast.success(`已更新工作区“${updatedWorkspace.displayName}”`);
    } catch (error) {
      console.error("[workspace-select] update workspace failed", error);
      toast.error(getErrorMessage(error, "更新工作区失败"));
    } finally {
      if (openedForUpdate && currentWorkspaceId !== editingWorkspace.id) {
        try {
          await workspace.close(editingWorkspace.id);
        } catch (error) {
          console.error("[workspace-select] close workspace after update failed", error);
        }
      }

      setIsUpdatingWorkspace(false);
    }
  }, [
    editedWorkspaceName,
    editingWorkspace,
    handleEditWorkspaceSheetOpenChange,
    isUpdatingWorkspace,
    currentWorkspaceId,
    refreshWorkspaces,
    toast,
  ]);
  const deleteWorkspace = useCallback(
    async (workspaceItem: WorkspaceListItem) => {
      if (isDeletingWorkspace) {
        return;
      }

      const result = await confirmNative({
        buttons: [
          { key: "cancel", style: "cancel", text: "取消" },
          { key: "delete", style: "destructive", text: "删除" },
        ],
        message: `删除工作区“${workspaceItem.displayName}”及其中的所有文件后无法恢复，是否继续？`,
        title: "警告",
      });

      if (result !== "delete") {
        return;
      }

      setIsDeletingWorkspace(true);

      try {
        await workspace.close(workspaceItem.id);
        const removedWorkspace = await workspace.remove(workspaceItem.id, true);

        if (currentWorkspaceId === workspaceItem.id) {
          setCurrentWorkspaceId(null);
        }

        await refreshWorkspaces();

        if (removedWorkspace.fileCleanup.status === "failed") {
          toast.warning("工作区已移除，但部分文件删除失败");
          return;
        }

        toast.success(`已删除工作区“${workspaceItem.displayName}”`);
      } catch (error) {
        console.error("[workspace-select] delete workspace failed", error);
        toast.error(getErrorMessage(error, "删除工作区失败"));
      } finally {
        setIsDeletingWorkspace(false);
      }
    },
    [currentWorkspaceId, isDeletingWorkspace, refreshWorkspaces, setCurrentWorkspaceId, toast],
  );
  const headerMenuItems = useMemo<MenuItemData[]>(
    () => [
      {
        disabled: workspaces.length === 0,
        icon: <CircleCheck color="$color10" size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_select",
          ios: { name: "checkmark.circle" },
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
          androidIconName: "ic_workspace_create",
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
          androidIconName: "ic_workspace_sort",
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
          androidIconName: "ic_workspace_settings",
          ios: { name: "gearshape" },
        },
        label: "设置",
        value: "settings",
        onPress: () => {
          router.push("/settings");
        },
      },
    ],
    [openCreateWorkspaceSheet, workspaces.length],
  );

  const sortedWorkspaces = useMemo(
    () => sortWorkspaces(workspaces, workspaceSortValue),
    [workspaceSortValue, workspaces],
  );
  const handleWorkspacePress = useCallback(
    async (workspaceId: string) => {
      if (isOpeningWorkspace || isDeletingWorkspace || isUpdatingWorkspace) {
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
    [
      isDeletingWorkspace,
      isOpeningWorkspace,
      isUpdatingWorkspace,
      openWorkspace,
      refreshWorkspaces,
      setCurrentWorkspaceId,
      toast,
    ],
  );
  const handleSelectedWorkspaceIdsChange = useCallback(
    (nextSelectedIds: Array<string | number>) => {
      setSelectedWorkspaceIds(nextSelectedIds.filter((id): id is string => typeof id === "string"));
    },
    [],
  );
  const areAllWorkspacesSelected =
    workspaces.length > 0 &&
    workspaces.every((workspaceItem) => selectedWorkspaceIds.includes(workspaceItem.id));
  const toggleSelectAllWorkspaces = useCallback(() => {
    setSelectedWorkspaceIds(
      areAllWorkspacesSelected ? [] : workspaces.map((workspaceItem) => workspaceItem.id),
    );
  }, [areAllWorkspacesSelected, workspaces]);
  const finishWorkspaceSelection = useCallback(() => {
    setIsWorkspaceSelectionMode(false);
    setSelectedWorkspaceIds([]);
  }, []);

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
          headerRight: () => {
            if (isWorkspaceSelectionMode) {
              return (
                <View style={styles.headerActions}>
                  <HeaderActionButton
                    accessibilityLabel={areAllWorkspacesSelected ? "取消全选工作区" : "全选工作区"}
                    circular={false}
                    label={areAllWorkspacesSelected ? "取消全选" : "全选"}
                    onPress={toggleSelectAllWorkspaces}
                  />
                  <HeaderActionButton
                    accessibilityLabel="完成选择工作区"
                    circular={false}
                    label="完成"
                    onPress={finishWorkspaceSelection}
                  />
                </View>
              );
            }

            return <Menu trigger={HeaderMenuActionButton} items={headerMenuItems} nativeHaptics />;
          },
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
                contextMenuProps={{
                  items: [
                    {
                      label: "编辑工作区",
                      onSelect: () => openEditWorkspaceSheet(workspaceItem),
                      value: `edit-workspace-${workspaceItem.id}`,
                    },
                    {
                      destructive: true,
                      label: "删除工作区",
                      onSelect: () => {
                        void deleteWorkspace(workspaceItem);
                      },
                      value: `delete-workspace-${workspaceItem.id}`,
                    },
                  ],
                }}
                disabled={isOpeningWorkspace || isDeletingWorkspace || isUpdatingWorkspace}
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
                subtitle={getWorkspaceSubtitle(workspaceItem, workspaceSortValue)}
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
      <EditWorkspaceSheet
        displayName={editedWorkspaceName}
        isUpdating={isUpdatingWorkspace}
        onChange={setEditedWorkspaceName}
        onOpenChange={handleEditWorkspaceSheetOpenChange}
        onSubmit={() => {
          void updateWorkspace();
        }}
        open={isEditWorkspaceSheetOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: 0,
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
