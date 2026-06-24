import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  WorkspaceRecord,
  WorkspaceRoot,
  WorkspaceSyncSummary,
  workspaceRegistry,
} from "@/api/commands/workspace";
import {
  Button,
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListItem,
  NativeListSection,
  Text,
} from "@/components/ui";
import { useCurrentWorkspaceState, useWorkspaceSession } from "@/hooks/workspace";

import type { DebugSectionContentProps } from "../../routes";

type WorkspaceDebugSnapshot = {
  records: WorkspaceRecord[];
  roots: WorkspaceRoot[];
};

type RefreshPanelOptions = {
  includeWorkspaceState?: boolean;
};

function formatRootSource(root: WorkspaceRoot) {
  switch (root.source.kind) {
    case "systemDefault":
      return "systemDefault";
    case "userAdded":
      return "userAdded";
    case "iosBookmark":
      return `iosBookmark:${root.source.bookmarkId}`;
    case "androidTreeUri":
      return `androidTreeUri:${root.source.treeUri}`;
  }
}

async function loadWorkspaceDebugSnapshot(): Promise<WorkspaceDebugSnapshot> {
  const [roots, records] = await Promise.all([
    workspaceRegistry.getRoots(),
    workspaceRegistry.listRecords(),
  ]);

  return {
    records,
    roots,
  };
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return <NativeListItem title={label} subtitle={value} />;
}

export function WorkspaceDebugPage({ header }: DebugSectionContentProps) {
  const { currentWorkspaceId } = useWorkspaceSession();
  const {
    clearError,
    close: closeWorkspace,
    error: workspaceError,
    isClosing: isWorkspaceClosing,
    isLoading: isWorkspaceLoading,
    isOpening: isWorkspaceOpening,
    isRefreshing: isWorkspaceRefreshing,
    open: openWorkspace,
    refresh: refreshWorkspaceState,
    state: currentState,
  } = useCurrentWorkspaceState();
  const [roots, setRoots] = useState<WorkspaceRoot[]>([]);
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [lastSyncSummary, setLastSyncSummary] = useState<WorkspaceSyncSummary | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);

  const error = panelError ?? workspaceError;
  const isRefreshingPanel = isRefreshing || isWorkspaceRefreshing;

  async function refreshPanel(options?: RefreshPanelOptions) {
    const includeWorkspaceState = options?.includeWorkspaceState ?? true;

    setIsRefreshing(true);
    setPanelError(null);
    clearError();

    try {
      const snapshot = await loadWorkspaceDebugSnapshot();

      if (includeWorkspaceState) {
        await refreshWorkspaceState();
      }

      setRoots(snapshot.roots);
      setRecords(snapshot.records);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setPanelError(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSyncRoots() {
    setIsSyncing(true);
    setPanelError(null);

    try {
      const summary = await workspaceRegistry.syncRoots();
      setLastSyncSummary(summary);
      await refreshPanel();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setPanelError(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleOpenWorkspace(workspaceId: string) {
    setPendingWorkspaceId(workspaceId);
    setPanelError(null);
    clearError();

    try {
      await openWorkspace(workspaceId);
      await refreshPanel();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setPanelError(message);
    } finally {
      setPendingWorkspaceId(null);
    }
  }

  async function handleCloseWorkspace(workspaceId: string) {
    setPendingWorkspaceId(workspaceId);
    setPanelError(null);
    clearError();

    try {
      await closeWorkspace(workspaceId);
      await refreshPanel();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setPanelError(message);
    } finally {
      setPendingWorkspaceId(null);
    }
  }

  useEffect(() => {
    void refreshPanel({ includeWorkspaceState: false });
  }, [currentWorkspaceId]);

  return (
    <NativeList>
      {header != null ? (
        <NativeListSection>
          <NativeListCustomItem>{header}</NativeListCustomItem>
        </NativeListSection>
      ) : null}

      <NativeListSection title="操作">
        <NativeListItem
          title="Workspace 调试面板"
          subtitle="展示 roots、同步结果、registry records 和当前 runtime state。"
        />
        <NativeListButtonItem
          title={isRefreshingPanel ? "刷新中..." : "刷新数据"}
          disabled={isRefreshingPanel || isSyncing || isWorkspaceLoading}
          onPress={() => refreshPanel()}
        />
        <NativeListButtonItem
          title={isSyncing ? "同步中..." : "同步 Roots"}
          disabled={isRefreshingPanel || isSyncing || isWorkspaceLoading}
          onPress={() => handleSyncRoots()}
        />
      </NativeListSection>

      {error ? (
        <NativeListSection title="错误">
          <NativeListItem title={error} />
        </NativeListSection>
      ) : null}

      <NativeListSection title="当前会话">
        <NativeListItem title="currentWorkspaceId" subtitle={currentWorkspaceId ?? "null"} />
        <KeyValueRow
          label="runtimeStatus"
          value={
            isWorkspaceLoading ? "loading" : (currentState?.runtimeStatus ?? "no-open-workspace")
          }
        />
        <KeyValueRow
          label="workspacePath"
          value={currentState?.record.metadata.path ?? "no-open-workspace"}
        />
        <KeyValueRow
          label="fileTreeSortType"
          value={String(currentState?.runtimeConfig.fileTreeSortType ?? "null")}
        />
        <KeyValueRow
          label="followGitignore"
          value={String(currentState?.runtimeConfig.followGitignore ?? false)}
        />
      </NativeListSection>

      <NativeListSection title="最近同步结果">
        <KeyValueRow label="importedCount" value={String(lastSyncSummary?.importedCount ?? 0)} />
        <KeyValueRow label="relocatedCount" value={String(lastSyncSummary?.relocatedCount ?? 0)} />
      </NativeListSection>

      <NativeListSection title={`Workspace Roots (${roots.length})`}>
        {roots.length === 0 ? (
          <NativeListItem title="暂无 roots。" />
        ) : (
          roots.map((root) => (
            <NativeListItem
              key={root.key}
              title={root.key}
              subtitle={`${root.kind} · ${formatRootSource(root)}\n${root.path}`}
            />
          ))
        )}
      </NativeListSection>

      <NativeListSection title={`Workspace Records (${records.length})`}>
        {records.length === 0 ? (
          <NativeListItem title="暂无已注册工作区。" />
        ) : (
          records.map((record) => {
            const workspaceId = record.metadata.id;
            const isCurrent = currentWorkspaceId === workspaceId;
            const isPending =
              pendingWorkspaceId === workspaceId && (isWorkspaceOpening || isWorkspaceClosing);

            return (
              <NativeListCustomItem key={workspaceId}>
                <View style={styles.itemCard}>
                  <View style={styles.stack}>
                    <Text fontSize="$3" fontWeight="600">
                      {record.metadata.name}
                    </Text>
                    <Text color="$color10" fontSize="$2">
                      id: {workspaceId}
                    </Text>
                    <Text fontSize="$3">{record.metadata.path}</Text>
                  </View>
                  <View style={styles.recordActions}>
                    <Text color="$color10" fontSize="$2">
                      {isCurrent ? "current" : "not-current"}
                    </Text>
                    {isCurrent ? (
                      <Button
                        disabled={isPending}
                        onPress={() => handleCloseWorkspace(workspaceId)}
                        variant="outlined"
                      >
                        {isPending ? "关闭中..." : "关闭"}
                      </Button>
                    ) : (
                      <Button
                        disabled={isPending}
                        onPress={() => handleOpenWorkspace(workspaceId)}
                        variant="outlined"
                      >
                        {isPending ? "打开中..." : "打开"}
                      </Button>
                    )}
                  </View>
                </View>
              </NativeListCustomItem>
            );
          })
        )}
      </NativeListSection>
    </NativeList>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  itemCard: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recordActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stack: {
    gap: 8,
  },
});
