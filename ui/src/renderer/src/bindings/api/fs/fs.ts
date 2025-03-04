import { invoke, invokeAsync } from '@/bindings/core';

export type SelectDialogType = 'openFile' | 'openFiles' | 'openFolder' | 'openFolders' | 'saveFile';

export interface SelectDialogFilter {
  name: string;
  extensions: string[];
}

export interface SelectDialogOptions {
  type: SelectDialogType;
  title?: string | null;
  filters?: SelectDialogFilter[] | null;
  defaultDirectory?: string | null;
  defaultFileName?: string | null;
}

export const fs = {
  exists: async (path: string): Promise<boolean> => {
    return (await invoke('fs.exists', { path }))!;
  },
  isDir: async (path: string): Promise<boolean> => {
    return (await invoke('fs.is_dir', { path }))!;
  },
  isFile: async (path: string): Promise<boolean> => {
    return (await invoke('fs.is_file', { path }))!;
  },
  readToString: async (path: string): Promise<string> => {
    return (await invoke('fs.read_to_string', { path }))!;
  },
  readBinary: async (path: string): Promise<number[]> => {
    return (await invoke('fs.read_binary', { path }))!;
  },
  createDir: async (path: string): Promise<void> => {
    return (await invoke('fs.create_dir', { path }))!;
  },
  createDirAll: async (path: string): Promise<void> => {
    return (await invoke('fs.create_dir_all', { path }))!;
  },
  write: async (path: string, contents: string): Promise<void> => {
    return (await invoke('fs.write', { path, contents }))!;
  },
  showInFolder: async (path: string): Promise<void> => {
    return (await invoke('fs.show_in_folder', { path }))!;
  },
  showSelectDialog: async (
    options: SelectDialogOptions,
  ): Promise<string | string[] | null | undefined> => {
    return (await invokeAsync('fs.show_select_dialog', options))!;
  },
};
