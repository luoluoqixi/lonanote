/** 所有入口共用一把进行中锁，避免菜单与原按钮同时触发。 */
export function createSingleFlight() {
  let pending: Promise<unknown> | null = null;
  return function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (pending) return pending as Promise<T>;
    const task = operation();
    pending = task;
    return task.finally(() => {
      if (pending === task) pending = null;
    });
  };
}

export async function saveDocuments(
  ids: readonly string[],
  save: (id: string) => Promise<void>,
): Promise<string[]> {
  const errors: string[] = [];
  for (const id of new Set(ids)) {
    try {
      await save(id);
    } catch (error) {
      errors.push(`${id}：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}
