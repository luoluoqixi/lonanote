/** 将异步监听注册与组件的同步清理衔接，清理操作至多执行一次。 */
export function createAsyncSubscription(
  subscribe: () => Promise<() => void | Promise<void>>,
  onError: (error: unknown) => void,
): () => void {
  let disposed = false;
  let release: (() => void | Promise<void>) | undefined;
  const cleanup = () => {
    const current = release;
    release = undefined;
    if (current) void Promise.resolve().then(current).catch(onError);
  };
  void subscribe()
    .then((unlisten) => {
      release = unlisten;
      if (disposed) cleanup();
    })
    .catch(onError);
  return () => {
    disposed = true;
    cleanup();
  };
}
