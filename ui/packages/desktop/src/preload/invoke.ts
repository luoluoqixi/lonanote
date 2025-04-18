import { ipcRenderer } from 'electron';

let jsFunctions:
  | Record<
      string,
      ((args: string | null | undefined) => Promise<string | null | undefined>) | undefined
    >
  | undefined = undefined;

ipcRenderer.on('jsFunctionCall', async (_, key, args, returnChannel) => {
  if (!jsFunctions || !jsFunctions[key]) {
    ipcRenderer.send(returnChannel, 0);
    return;
  }
  let res: string | null | undefined;
  try {
    res = await jsFunctions[key](args);
  } catch (e) {
    console.error('jsFunctionCall error:', e);
    res = undefined;
  }
  ipcRenderer.send(returnChannel, 1, res);
});

export const invoke = {
  invoke: async (key: string, args: string | null | undefined) => {
    return await ipcRenderer.invoke('invoke', key, args);
  },
  getCommandKeys: async () => {
    return await ipcRenderer.invoke('getCommandKeys');
  },
  getCommandLen: async () => {
    return await ipcRenderer.invoke('getCommandLen');
  },

  invokeAsync: async (key: string, args: string | null | undefined) => {
    return await ipcRenderer.invoke('invokeAsync', key, args);
  },
  getCommandAsyncKeys: async () => {
    return await ipcRenderer.invoke('getCommandAsyncKeys');
  },
  getCommandAsyncLen: async () => {
    return await ipcRenderer.invoke('getCommandAsyncLen');
  },

  regJsFunction: async (
    key: string,
    callback: (args: string | null | undefined) => Promise<string | null | undefined>,
  ) => {
    jsFunctions = jsFunctions || {};
    jsFunctions[key] = callback;
    return await ipcRenderer.invoke('regJsFunction', key);
  },
  unregJsFunction: async (key: string) => {
    if (jsFunctions) {
      jsFunctions[key] = undefined;
    }
    return await ipcRenderer.invoke('unregJsFunction', key);
  },
  clearJsFunction: async () => {
    jsFunctions = {};
    return await ipcRenderer.invoke('clearJsFunction');
  },
  getCommandJsKeys: async () => {
    return await ipcRenderer.invoke('getCommandJsKeys');
  },
  getCommandJsLen: async () => {
    return await ipcRenderer.invoke('getCommandJsLen');
  },
};
