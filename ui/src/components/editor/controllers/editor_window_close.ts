import { createClosePreparation } from "@/api/common/window_close_preparation";

/** owner 的准备事务按远端成员隔离，异常销毁与正常 abort 共用同一撤销路径。 */
export function createRemoteWindowCloseRegistry() {
  const preparations = new Map<
    string,
    { windowLabel: string; value: ReturnType<typeof createClosePreparation> }
  >();
  const abortedRequests = new Set<string>();
  return {
    async prepare(
      requestId: string,
      windowLabel: string,
      start: () => ReturnType<typeof createClosePreparation>,
    ) {
      if (abortedRequests.has(requestId)) return false;
      let entry = preparations.get(requestId);
      if (entry && entry.windowLabel !== windowLabel) throw new Error("关闭事务不属于该窗口");
      if (!entry) {
        entry = { windowLabel, value: start() };
        preparations.set(requestId, entry);
      }
      const accepted = await entry.value.ready;
      if (!accepted && entry.value.getError()) throw entry.value.getError();
      return accepted;
    },
    async finish(requestId: string, commit: boolean, windowLabel?: string) {
      const entry = preparations.get(requestId);
      if (!entry) return false;
      if (windowLabel && windowLabel !== entry.windowLabel) throw new Error("关闭事务不属于该窗口");
      if (!commit) abortedRequests.add(requestId);
      const result = await entry.value.finish(commit);
      preparations.delete(requestId);
      return result;
    },
    async abort(windowLabel: string, requestId?: string | null) {
      if (requestId) abortedRequests.add(requestId);
      await Promise.all(
        [...preparations]
          .filter(
            ([id, entry]) => entry.windowLabel === windowLabel && (!requestId || requestId === id),
          )
          .map(async ([id, entry]) => {
            abortedRequests.add(id);
            await entry.value.finish(false);
            preparations.delete(id);
          }),
      );
    },
  };
}

/** 辅助窗口只负责输入屏障，文档确认和释放始终由 owner 完成。 */
export function prepareAuxiliaryWindowClose(deps: {
  requestId: string;
  editorIds: string[];
  closingOwner: boolean;
  isOwnerDestroyed?(): Promise<boolean>;
  confirmOrphanedClose?(): Promise<"copy" | "discard" | "cancel">;
  copyRecoveryDraft?(): Promise<void>;
  flush(): Promise<void>;
  prepareOwner(requestId: string, editorIds: string[]): Promise<boolean>;
  finishOwner(requestId: string, commit: boolean): Promise<boolean>;
}) {
  return createClosePreparation(async (waitForCommit, signal) => {
    if (await deps.isOwnerDestroyed?.()) {
      if (signal.aborted || !deps.confirmOrphanedClose) return false;
      let stopWaiting: () => void = () => {};
      const cancelled = new Promise<"cancel">((resolve) => {
        const abort = () => resolve("cancel");
        signal.addEventListener("abort", abort, { once: true });
        stopWaiting = () => signal.removeEventListener("abort", abort);
      });
      const decision = await Promise.race([deps.confirmOrphanedClose(), cancelled]).finally(() =>
        stopWaiting(),
      );
      if (decision === "cancel" || signal.aborted) return false;
      if (decision === "copy") {
        if (!deps.copyRecoveryDraft) throw new Error("无法复制保留的草稿，请取消并手动复制");
        await deps.copyRecoveryDraft();
      }
      if (signal.aborted) return false;
      // 这里只允许原生事务提交，不销毁任何本地 buffer。
      return waitForCommit();
    }
    await deps.flush();
    if (deps.closingOwner) return waitForCommit();
    try {
      const prepared = await deps.prepareOwner(deps.requestId, deps.editorIds);
      if (!prepared) {
        await deps.finishOwner(deps.requestId, false);
        return false;
      }
      const commit = await waitForCommit();
      return await deps.finishOwner(deps.requestId, commit);
    } catch (error) {
      // prepare 响应丢失也可能已在 owner 持有屏障，失败时显式尝试撤销。
      await deps.finishOwner(deps.requestId, false).catch(() => undefined);
      throw error;
    }
  });
}
