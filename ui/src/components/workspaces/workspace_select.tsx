import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import {
  Button,
  Menu,
  MenuItemData,
  NativeList,
  NativeListItem,
  NativeListNavigationItem,
  NativeListSection,
  Text,
  isIos26Plus,
  triggerNativeHaptics,
} from "rn-ui-kit";

import { type WorkspaceRecord, workspaceRegistry } from "@/api/commands/workspace";
import { os } from "@/api/common";

type WorkspaceSelectProps = {
  onLeftActionPress?: () => void;
  onRightActionPress?: () => void;
  onWorkspacePress?: (workspace: WorkspaceRecord) => void;
};

type HeaderActionButtonProps = {
  accessibilityLabel: string;
  label: string;
  onPress?: () => void;
};

const headerMengItems: MenuItemData[] = [
  {
    label: "选择工作区",
    value: "select-workspace",
  },
  {
    label: "创建工作区",
    value: "create-workspace",
  },
  {
    label: "排序方式",
    value: "sort-workspace",
  },
  {
    label: "设置",
    value: "settings",
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

export function WorkspaceSelect({
  onRightActionPress,
  onWorkspacePress,
}: WorkspaceSelectProps = {}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const usesNativeIosHeader = os() === "ios";
  const tracksNavigationBarScrollEdge = usesNativeIosHeader && !isIos26Plus();

  useEffect(() => {
    let isActive = true;

    void workspaceRegistry
      .listRecords()
      .then((records) => {
        if (!isActive) {
          return;
        }

        setWorkspaces(records);
        setHasError(false);
      })
      .catch((nextError: unknown) => {
        if (!isActive) {
          return;
        }

        console.error("[workspace-select] load workspaces failed", nextError);
        setHasError(true);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort(
        (left, right) => (right.metadata.updateTime ?? 0) - (left.metadata.updateTime ?? 0),
      ),
    [workspaces],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Menu
              trigger={
                <HeaderActionButton
                  accessibilityLabel="右侧操作"
                  label="•••"
                  onPress={onRightActionPress}
                />
              }
              items={headerMengItems}
            />
          ),
        }}
      />
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
        contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
        style={styles.list}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        <NativeListSection>
          {isLoading ? (
            <NativeListItem disabled title="正在加载工作区" />
          ) : hasError ? (
            <NativeListItem disabled title="工作区加载失败" />
          ) : sortedWorkspaces.length === 0 ? (
            <NativeListItem disabled title="暂无工作区" />
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
                onPress={onWorkspacePress ? () => onWorkspacePress(workspace) : undefined}
                paddingVertical={10}
                sfSymbol="folder.fill"
                subtitle={formatWorkspaceTime(workspace.metadata.updateTime)}
                subtitleFontSize={12}
                title={workspace.metadata.name}
                titleFontSize={16}
              />
            ))
          )}
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
});
