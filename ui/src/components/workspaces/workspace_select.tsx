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
  Text,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";
import { formatUnixSecondsDateTime, isIos, isSystemLocaleCN, os } from "@/api/common";

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
  createWorkspacePress: (wsName: string) => {
    console.log(wsName);
  },
};

const getDefaultNewNoteName = () => {
  return isSystemLocaleCN() ? "我的笔记" : "My Notes";
};

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
  setDisplayName,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  displayName: string;
  setDisplayName: (v: string) => void;
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
            onSubmit={() => {
              pressActions.createWorkspacePress(displayName);
            }}
          />
        )}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

function CreateWorkspaceSheetContent({
  displayName,
  onChange,
  onSubmit,
}: {
  displayName: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const isFocused = useIsFocused();

  return (
    <NativeSheetScrollContent
      bindToNativeSheet={isFocused}
      contentContainerStyle={styles.createSheetContent}
    >
      <Label htmlFor="workspace-display-name" color="$gray12">
        工作区名称
      </Label>
      <Input
        autoFocus
        id="workspace-display-name"
        onChangeText={onChange}
        placeholder="我的笔记"
        value={displayName}
      />
      <Button theme="accent" title="确定" onPress={onSubmit} />
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
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreateWorkspaceSheetOpen, setIsCreateWorkspaceSheetOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const requestIdRef = useRef(0);
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
  const openCreateWorkspaceSheet = useCallback(() => {
    setDisplayName(getDefaultNewNoteName());
    setIsCreateWorkspaceSheetOpen(true);
  }, []);
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
        setDisplayName={setDisplayName}
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
