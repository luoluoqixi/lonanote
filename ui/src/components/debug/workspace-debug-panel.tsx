import { type ReactNode, useEffect, useState } from "react";
import { Text, View } from "react-native";

import {
  WorkspaceRecord,
  WorkspaceRoot,
  WorkspaceState,
  WorkspaceSyncSummary,
  useWorkspaceSession,
  workspaceRegistry,
  workspaceRuntime,
} from "@/api/commands/workspace";
import { Button } from "@/components/ui";

type WorkspaceDebugSnapshot = {
  roots: WorkspaceRoot[];
  records: WorkspaceRecord[];
  currentState: WorkspaceState | null;
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

async function loadWorkspaceDebugSnapshot(
  currentWorkspaceId: string | null,
): Promise<WorkspaceDebugSnapshot> {
  const [roots, records, currentState] = await Promise.all([
    workspaceRegistry.getRoots(),
    workspaceRegistry.listRecords(),
    currentWorkspaceId ? workspaceRuntime.getState(currentWorkspaceId) : Promise.resolve(null),
  ]);

  return {
    roots,
    records,
    currentState,
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2 rounded-xl border border-foreground/10 bg-background px-3 py-3">
      <View className="gap-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        {description ? <Text className="text-xs text-foreground/60">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2">
      <Text className="text-[11px] uppercase tracking-wide text-foreground/50">{label}</Text>
      <Text className="text-sm text-foreground">{value}</Text>
    </View>
  );
}

export function WorkspaceDebugPanel() {
  const { currentWorkspaceId } = useWorkspaceSession();
  const [roots, setRoots] = useState<WorkspaceRoot[]>([]);
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [currentState, setCurrentState] = useState<WorkspaceState | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<WorkspaceSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);

  async function refreshPanel() {
    setIsRefreshing(true);
    setError(null);

    try {
      const snapshot = await loadWorkspaceDebugSnapshot(currentWorkspaceId);
      setRoots(snapshot.roots);
      setRecords(snapshot.records);
      setCurrentState(snapshot.currentState);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSyncRoots() {
    setIsSyncing(true);
    setError(null);

    try {
      const summary = await workspaceRegistry.syncRoots();
      setLastSyncSummary(summary);
      await refreshPanel();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleOpenWorkspace(workspaceId: string) {
    setPendingWorkspaceId(workspaceId);
    setError(null);

    try {
      const nextState = await workspaceRuntime.open(workspaceId);
      setCurrentState(nextState);
      await refreshPanel();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
    } finally {
      setPendingWorkspaceId(null);
    }
  }

  async function handleCloseWorkspace(workspaceId: string) {
    setPendingWorkspaceId(workspaceId);
    setError(null);

    try {
      await workspaceRuntime.close(workspaceId);
      setCurrentState(null);
      await refreshPanel();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
    } finally {
      setPendingWorkspaceId(null);
    }
  }

  useEffect(() => {
    void refreshPanel();
  }, [currentWorkspaceId]);

  return (
    <View className="w-full gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
      <View className="gap-3 md:flex-row md:items-center md:justify-between">
        <View className="gap-1">
          <Text className="text-base font-semibold text-foreground">Workspace 调试面板</Text>
          <Text className="text-sm text-foreground/70">
            展示 roots、同步结果、registry records 和当前 runtime state。
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Button variant="outline" onPress={refreshPanel} isDisabled={isRefreshing || isSyncing}>
            {isRefreshing ? "刷新中..." : "刷新数据"}
          </Button>
          <Button
            variant="outline"
            onPress={handleSyncRoots}
            isDisabled={isRefreshing || isSyncing}
          >
            {isSyncing ? "同步中..." : "同步 Roots"}
          </Button>
        </View>
      </View>

      {error ? (
        <Text className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</Text>
      ) : null}

      <Section title="当前会话" description="当前 session 中记录的 workspace 与 runtime 返回状态。">
        <View className="gap-2">
          <KeyValueRow label="currentWorkspaceId" value={currentWorkspaceId ?? "null"} />
          <KeyValueRow
            label="runtimeStatus"
            value={currentState?.runtimeStatus ?? "no-open-workspace"}
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
        </View>
      </Section>

      <Section title="最近同步结果" description="只记录本次面板内手动执行 sync roots 的结果。">
        <View className="gap-2">
          <KeyValueRow label="importedCount" value={String(lastSyncSummary?.importedCount ?? 0)} />
          <KeyValueRow
            label="relocatedCount"
            value={String(lastSyncSummary?.relocatedCount ?? 0)}
          />
        </View>
      </Section>

      <Section
        title={`Workspace Roots (${roots.length})`}
        description="当前 registry 中持久化的 roots 配置。"
      >
        <View className="gap-2">
          {roots.length === 0 ? (
            <Text className="text-sm text-foreground/60">暂无 roots。</Text>
          ) : (
            roots.map((root) => (
              <View
                key={root.key}
                className="gap-1 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2"
              >
                <Text className="text-sm font-medium text-foreground">{root.key}</Text>
                <Text className="text-xs text-foreground/60">
                  {root.kind} · {formatRootSource(root)}
                </Text>
                <Text className="text-sm text-foreground">{root.path}</Text>
              </View>
            ))
          )}
        </View>
      </Section>

      <Section
        title={`Workspace Records (${records.length})`}
        description="可直接在面板内 open/close 当前工作区。"
      >
        <View className="gap-2">
          {records.length === 0 ? (
            <Text className="text-sm text-foreground/60">暂无已注册工作区。</Text>
          ) : (
            records.map((record) => {
              const workspaceId = record.metadata.id;
              const isCurrent = currentWorkspaceId === workspaceId;
              const isPending = pendingWorkspaceId === workspaceId;

              return (
                <View
                  key={workspaceId}
                  className="gap-2 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-3"
                >
                  <View className="gap-1">
                    <Text className="text-sm font-medium text-foreground">
                      {record.metadata.name}
                    </Text>
                    <Text className="text-xs text-foreground/60">id: {workspaceId}</Text>
                    <Text className="text-sm text-foreground">{record.metadata.path}</Text>
                  </View>

                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-xs text-foreground/60">
                      {isCurrent ? "current" : "not-current"}
                    </Text>
                    {isCurrent ? (
                      <Button
                        variant="ghost"
                        onPress={() => handleCloseWorkspace(workspaceId)}
                        isDisabled={isPending}
                      >
                        {isPending ? "关闭中..." : "关闭"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onPress={() => handleOpenWorkspace(workspaceId)}
                        isDisabled={isPending}
                      >
                        {isPending ? "打开中..." : "打开"}
                      </Button>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Section>
    </View>
  );
}
