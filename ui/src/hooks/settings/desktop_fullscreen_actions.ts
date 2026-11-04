/** 串行读取原生状态，避免快速切换或查询响应倒序覆盖最新状态。 */
export function createFullscreenActions(adapter: {
  get(): Promise<boolean>;
  set(next: boolean): Promise<void>;
  publish(next: boolean): void;
}) {
  let queue = Promise.resolve();
  const run = (action: () => Promise<void>) => {
    const task = queue.then(action);
    queue = task.catch(() => undefined);
    return task;
  };
  const set = async (next: boolean) => {
    await adapter.set(next);
    adapter.publish(await adapter.get());
  };
  return {
    refresh: () => run(async () => adapter.publish(await adapter.get())),
    set: (next: boolean) => run(() => set(next)),
    toggle: () => run(async () => set(!(await adapter.get()))),
  };
}
