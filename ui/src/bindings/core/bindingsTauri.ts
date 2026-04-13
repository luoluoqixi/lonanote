import {
  InvokeArgs,
  InvokeOptions,
  invoke as _invoke,
  isTauri as _isTauri,
} from '@tauri-apps/api/core';

export const invoke = async <T>(
  cmd: string,
  args?: any,
  options?: InvokeOptions,
): Promise<T | undefined> => {
  return await _invoke(cmd, args, options);
};

export const invokePlugin = async <T>(
  pluginName: string,
  funcName: string,
  args?: InvokeArgs,
  options?: InvokeOptions,
): Promise<T | undefined> => {
  return await _invoke(`plugin:${pluginName}|${funcName}`, args, options);
};

export const isTauri = _isTauri();
