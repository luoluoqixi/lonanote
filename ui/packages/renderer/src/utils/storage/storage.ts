export type StorageType = 'localStorage' | 'sessionStorage';

export interface StorageOptions {
  keyPrefix?: string;
  type: StorageType;
}

const getIsSupport = (storageType: StorageType) => {
  if (!window) {
    return false;
  }
  if (storageType === 'localStorage' && !window.localStorage) {
    return false;
  }
  if (storageType === 'sessionStorage' && !window.sessionStorage) {
    return false;
  }
  return true;
};

export class BrowserStorage {
  private keyPrefix: string;
  private type: StorageType;
  private readonly support: boolean;

  constructor({ keyPrefix, type }: StorageOptions) {
    this.keyPrefix = keyPrefix || '';
    this.type = type;
    this.support = getIsSupport(type);
    if (!this.support) {
      console.warn(`not support ${this.type}`);
    }
  }

  private getStorage() {
    if (this.type === 'localStorage') {
      return window.localStorage;
    } else if (this.type === 'sessionStorage') {
      return window.sessionStorage;
    }
    throw new Error('not support');
  }

  private getKey(key: string) {
    return this.keyPrefix + key;
  }

  public setKeyPrefix(keyPrefix?: string) {
    this.keyPrefix = keyPrefix || '';
  }

  /** 序列化数据 */
  private serializeData(value: any): string {
    return JSON.stringify(value);
  }

  /** 反序列化数据 */
  private deserializeData(data: string | null): any {
    if (data == null) return null;
    return JSON.parse(data);
  }

  /** 设置数据 */
  public set(key: string, value: any) {
    if (!this.support) return;
    if (!value) value = null;
    const data = this.serializeData(value);
    const storageKey = this.getKey(key);
    this.getStorage().setItem(storageKey, data);
  }

  /** 获取数据 */
  public get(key: string): any | undefined {
    if (!this.support) return null;
    if (!key) return null;
    const storage = this.getStorage();
    const data = storage.getItem(this.getKey(key)) as string;
    if (data == null) return undefined;
    return this.deserializeData(data);
  }

  /** 是否存在 */
  public has(key: string): boolean {
    if (!this.support) return false;
    if (!key) return false;
    return this.getStorage().getItem(this.getKey(key)) == null;
  }

  /** 删除数据 */
  public async delete(key: string) {
    if (!this.support) return;
    this.getStorage().removeItem(this.getKey(key));
  }

  /** 清空数据 */
  public async clear() {
    if (!this.support) return;
    this.getStorage().clear();
  }

  /**
   * 获取所有数据
   * @returns {{ [x: string]: string }}
   */
  public all(): Record<string, any> {
    if (!this.support) return {};
    const storage = this.getStorage();
    const length = storage.length;
    const result: { [x: string]: string } = {};
    for (let i = 0; i < length; i++) {
      const key = storage.key(i);
      if (key == null) continue;
      result[key] = this.get(key);
    }
    return result;
  }
}

export type OmitStorageOptions = Omit<StorageOptions, 'type'>;

export class BrowserLocalStorage extends BrowserStorage {
  constructor(options?: OmitStorageOptions) {
    options = options || {};
    super({
      ...options,
      type: 'localStorage',
    });
  }
}

export class BrowserSessionStorage extends BrowserStorage {
  constructor(options?: OmitStorageOptions) {
    options = options || {};
    super({
      ...options,
      type: 'sessionStorage',
    });
  }
}
