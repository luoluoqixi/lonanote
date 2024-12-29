import Store from 'electron-store';

interface StoreType extends Store {
  /** 配置对象 */
  store: Record<string, any>;
  /** 配置存储路径 */
  path: string;
  /** get */
  get: (key: string) => any;
  /** set */
  set: (key: string, val: any) => void;
  /** 检查某个 `key` 是否存在 */
  has: (key: string) => boolean;
  /** 删除指定 `key` */
  delete: (key: string) => void;
  /** 重置指定 `keys` 为默认值 */
  reset: (...keys: string[]) => void;
  /** 删除所有 */
  clear: () => void;
  /** size */
  size: () => number;
  /**
   * 观察给定的 `key`, 任何更改会调用 `callback`
   *
   * 当第一次设置 `key` 时 `oldValue` 将是 `undefined`, 而当删除 `key` 时 `newValue` 将是 `undefined`
   *
   * 返回一个可以用来取消订阅的函数
   * ```
   * const unsubscribe = store.onDidChange(key, callback);
   * unsubscribe();
   * ```
   */
  onDidChange: (key: string, callback: (newVal: any, oldVal: any) => void) => () => void;
}

export const createStore = (): StoreType => {
  const store = new Store();
  return store as any;
};
