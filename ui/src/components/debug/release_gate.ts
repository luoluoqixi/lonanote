/** Release 是否启用调试（正式上线前改为 false） */
export const DEBUG_ALLOW_IN_RELEASE = true;

export function isDebugFeatureEnabled(): boolean {
  return __DEV__ || DEBUG_ALLOW_IN_RELEASE;
}
