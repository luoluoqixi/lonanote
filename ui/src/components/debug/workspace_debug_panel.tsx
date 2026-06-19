import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  WorkspaceRecord,
  WorkspaceRoot,
  WorkspaceSyncSummary,
  workspaceRegistry,
} from "@/api/commands/workspace";
import { Button, NativeList, NativeListItem, NativeListSection, Text } from "@/components/ui";
import { useCurrentWorkspaceState, useWorkspaceSession } from "@/hooks/workspace";

type WorkspaceDebugSnapshot = {
  roots: WorkspaceRoot[];
  records: WorkspaceRecord[];
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
    roots,
    records,
  };
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValueRow}>
      <Text color="$color10" fontSize="$2">
        {label}
      </Text>
      <Text fontSize="$3">{value}</Text>
    </View>
  );
}

export function WorkspaceDebugPanel() {
  const { currentWorkspaceId } = useWorkspaceSession();
  const {
    state: currentState,
    error: workspaceError,
    isLoading: isWorkspaceLoading,
    isRefreshing: isWorkspaceRefreshing,
    isOpening: isWorkspaceOpening,
    isClosing: isWorkspaceClosing,
    refresh: refreshWorkspaceState,
    open: openWorkspace,
    close: closeWorkspace,
    clearError: clearWorkspaceError,
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
    clearWorkspaceError();

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
    clearWorkspaceError();

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
    clearWorkspaceError();

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
    <View style={styles.inlineSectionList}>
      <NativeList>
        <NativeListSection title="操作">
          <NativeListItem>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text fontSize="$5" fontWeight="600">
                  Workspace 调试面板
                </Text>
                <Text color="$color10" fontSize="$3">
                  展示 roots、同步结果、registry records 和当前 runtime state。
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  disabled={isRefreshingPanel || isSyncing || isWorkspaceLoading}
                  onPress={() => refreshPanel()}
                  variant="outlined"
                >
                  {isRefreshingPanel ? "刷新中..." : "刷新数据"}
                </Button>
                <Button
                  disabled={isRefreshingPanel || isSyncing || isWorkspaceLoading}
                  onPress={() => handleSyncRoots()}
                  variant="outlined"
                >
                  {isSyncing ? "同步中..." : "同步 Roots"}
                </Button>
              </View>
            </View>
          </NativeListItem>
        </NativeListSection>

        {error ? (
          <NativeListSection title="错误">
            <NativeListItem>
              <View style={styles.errorBox}>
                <Text color="$red10" fontSize="$3">{error}</Text>
              </View>
            </NativeListItem>
          </NativeListSection>
        ) : null}

        <NativeListSection title="当前会话">
          <NativeListItem>
            <KeyValueRow label="currentWorkspaceId" value={currentWorkspaceId ?? "null"} />
          </NativeListItem>
          <NativeListItem>
            <KeyValueRow
              label="runtimeStatus"
              value={
                isWorkspaceLoading
                  ? "loading"
                  : (currentState?.runtimeStatus ?? "no-open-workspace")
              }
            />
          </NativeListItem>
          <NativeListItem>
            <KeyValueRow
              label="workspacePath"
              value={currentState?.record.metadata.path ?? "no-open-workspace"}
            />
          </NativeListItem>
          <NativeListItem>
            <KeyValueRow
              label="fileTreeSortType"
              value={String(currentState?.runtimeConfig.fileTreeSortType ?? "null")}
            />
          </NativeListItem>
          <NativeListItem>
            <KeyValueRow
              label="followGitignore"
              value={String(currentState?.runtimeConfig.followGitignore ?? false)}
            />
          </NativeListItem>
        </NativeListSection>

        <NativeListSection title="最近同步结果">
          <NativeListItem>
            <KeyValueRow
              label="importedCount"
              value={String(lastSyncSummary?.importedCount ?? 0)}
            />
          </NativeListItem>
          <NativeListItem>
            <KeyValueRow
              label="relocatedCount"
              value={String(lastSyncSummary?.relocatedCount ?? 0)}
            />
          </NativeListItem>
        </NativeListSection>

        <NativeListSection title={`Workspace Roots (${roots.length})`}>
          {roots.length === 0 ? (
            <NativeListItem>
              <Text color="$color10" fontSize="$3">暂无 roots。</Text>
            </NativeListItem>
          ) : (
            roots.map((root) => (
              <NativeListItem key={root.key}>
                <View style={styles.itemCard}>
                  <Text fontSize="$3" fontWeight="600">{root.key}</Text>
                  <Text color="$color10" fontSize="$2">
                    {root.kind} · {formatRootSource(root)}
                  </Text>
                  <Text fontSize="$3">{root.path}</Text>
                </View>
              </NativeListItem>
            ))
          )}
        </NativeListSection>

        <NativeListSection title={`Workspace Records (${records.length})`}>
          {records.length === 0 ? (
            <NativeListItem>
              <Text color="$color10" fontSize="$3">暂无已注册工作区。</Text>
            </NativeListItem>
          ) : (
            records.map((record) => {
              const workspaceId = record.metadata.id;
              const isCurrent = currentWorkspaceId === workspaceId;
              const isPending =
                pendingWorkspaceId === workspaceId && (isWorkspaceOpening || isWorkspaceClosing);

              return (
                <NativeListItem key={workspaceId}>
                  <View style={styles.itemCard}>
                    <View style={styles.stack}>
                      <Text fontSize="$3" fontWeight="600">{record.metadata.name}</Text>
                      <Text color="$color10" fontSize="$2">id: {workspaceId}</Text>
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
                </NativeListItem>
              );
            })
          )}
        </NativeListSection>
      </NativeList>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 4,
    minWidth: 260,
  },
  itemCard: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keyValueRow: {
    borderColor: "rgba(128, 128, 128, 0.18)",
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  inlineSectionList: {
    gap: 16,
  },
});
