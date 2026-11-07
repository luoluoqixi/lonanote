/** 准备阶段持有文档 mutation 屏障，收到所有窗口的最终决定后才释放。 */
export function createClosePreparation(
  close: (waitForCommit: () => Promise<boolean>, signal: AbortSignal) => Promise<boolean>,
) {
  const cancellation = new AbortController();
  let markReady!: (ready: boolean) => void;
  let decide!: (commit: boolean) => void;
  let failure: unknown;
  const ready = new Promise<boolean>((resolve) => {
    markReady = resolve;
  });
  const decision = new Promise<boolean>((resolve) => {
    decide = resolve;
  });
  const done = close(async () => {
    markReady(true);
    return decision;
  }, cancellation.signal).then(
    (result) => {
      markReady(false);
      return result;
    },
    (error) => {
      failure = error;
      markReady(false);
      return false;
    },
  );
  return {
    getError: () => failure,
    ready,
    finish: (commit: boolean) => {
      if (!commit) cancellation.abort();
      decide(commit);
      return done;
    },
  };
}

const barriers = new Set<string>();
export function holdWindowCloseBarrier(id: string): void {
  barriers.add(id);
}
export function releaseWindowCloseBarrier(id: string): void {
  barriers.delete(id);
}
export function assertWindowCanOpen(): void {
  if (barriers.size) throw new Error("窗口正在确认关闭，请完成或取消当前操作");
}
