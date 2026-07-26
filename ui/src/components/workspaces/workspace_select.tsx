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
  NativeListNavigationItem,
  NativeListSection,
  Text,
  isIos26Plus,
  triggerNativeHaptics,
} from "rn-ui-kit";

import { type WorkspaceRecord, workspaceRegistry } from "@/api/commands/workspace";
import { os } from "@/api/common";

type HeaderActionButtonProps = {
  accessibilityLabel: string;
  label: string;
  onPress?: () => void;
};

const MIN_PULL_TO_REFRESH_DURATION_MS = 500;

const pressActions = {
  selectWorkspacePress: () => {
    console.log("todo");
  },
  createWorkspacePress: () => {
    console.log("todo");
  },
  sortWorkspacePress: () => {
    console.log("todo");
  },
  openSettingsPress: () => {
    router.push("/settings");
  },
};

const headerMengItems: MenuItemData[] = [
  {
    label: "选择工作区",
    value: "select-workspace",
    onPress: pressActions.selectWorkspacePress,
  },
  {
    label: "创建工作区",
    value: "create-workspace",
    onPress: pressActions.createWorkspacePress,
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
];

function HeaderActionButton({ accessibilityLabel, label, onPress }: HeaderActionButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        triggerNativeHaptics(true);
        onPress?.();
      }}
      native
      title={label}
    />
  );
}

function formatWorkspaceTime(timestamp?: number | null) {
  if (timestamp == null) {
    return undefined;
  }

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return `最近打开于 ${date.toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
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
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const requestIdRef = useRef(0);
  const usesNativeIosHeader = os() === "ios";
  const tracksNavigationBarScrollEdge = usesNativeIosHeader && !isIos26Plus();

  const refreshWorkspaces = useCallback(async (minimumDurationMs = 0) => {
    const requestId = ++requestIdRef.current;
    const startedAt = Date.now();

    try {
      const records = await workspaceRegistry.listRecords();
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

  useEffect(() => {
    void refreshWorkspaces();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshWorkspaces]);

  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort(
        (left, right) => (right.metadata.updateTime ?? 0) - (left.metadata.updateTime ?? 0),
      ),
    [workspaces],
  );
  const statusMessage = isLoading
    ? "正在加载工作区"
    : hasError && sortedWorkspaces.length === 0
      ? "工作区加载失败"
      : sortedWorkspaces.length === 0
        ? "暂无工作区"
        : null;
  const showCreateWorkspaceButton = !isLoading && !hasError && sortedWorkspaces.length === 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Menu
              trigger={<HeaderActionButton accessibilityLabel="右侧操作" label="•••" />}
              items={headerMengItems}
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
            sortedWorkspaces.map((workspace) => (
              <NativeListNavigationItem
                icon={
                  <Text color="$color10" fontSize="$7">
                    ▣
                  </Text>
                }
                iconSize={24}
                iconSlotWidth={28}
                key={workspace.metadata.id}
                nativeScrollId={workspace.metadata.id}
                onPress={() => {}}
                paddingVertical={10}
                sfSymbol="folder.fill"
                subtitle={formatWorkspaceTime(workspace.metadata.updateTime)}
                subtitleFontSize={12}
                title={workspace.metadata.name}
                titleFontSize={16}
              />
            ))
          )}
          {showCreateWorkspaceButton ? (
            <NativeListButtonItem onPress={pressActions.createWorkspacePress} title="新建工作区" />
          ) : null}
        </NativeListSection>
      </NativeList>
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
