type MenuResource = { install(): Promise<void>; close(): Promise<void> };
type MenuOperationRunner = <T>(operation: () => Promise<T>) => Promise<T>;

/** 串行安装；创建期间被替换或卸载的资源只释放，不再挂到应用。 */
export function createMenuLifecycle(
  runOperation: MenuOperationRunner = (operation) => operation(),
) {
  let revision = 0;
  let active: MenuResource | null = null;
  let queue = Promise.resolve();
  return {
    replace(create: () => Promise<MenuResource>) {
      const request = ++revision;
      const task = queue.then(() =>
        runOperation(async () => {
          if (request !== revision) return;
          const resource = await create();
          if (request !== revision) {
            await resource.close();
            return;
          }
          try {
            await resource.install();
          } catch (error) {
            await resource.close();
            throw error;
          }
          const previous = active;
          active = resource;
          await previous?.close();
        }),
      );
      queue = task.catch(() => undefined);
      return task;
    },
    dispose() {
      revision++;
      const task = queue.then(() =>
        runOperation(async () => {
          const previous = active;
          active = null;
          await previous?.close();
        }),
      );
      queue = task.catch(() => undefined);
      return task;
    },
  };
}
