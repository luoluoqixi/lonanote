import { invoke, invokeAsync, isTauri } from '@/bindings/core';

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
  createFile: async (path: string, contents: string): Promise<void> => {
    return (await invoke('fs.create_file', { path, contents }))!;
  },
  delete: async (path: string, trash: boolean): Promise<void> => {
    return (await invoke('fs.delete', { path, trash }))!;
  },
  move: async (srcPath: string, targetPath: string, override: boolean): Promise<void> => {
    return (await invoke('fs.move', { srcPath, targetPath, override }))!;
  },
  copy: async (srcPath: string, targetPath: string, override: boolean): Promise<void> => {
    return (await invoke('fs.copy', { srcPath, targetPath, override }))!;
  },
  write: async (path: string, contents: string): Promise<void> => {
    return (await invoke('fs.write', { path, contents }))!;
  },
  writeBinary: async (path: string, buffer: ArrayBuffer): Promise<void> => {
    if (window.api) {
      window.api.utils.writeBinaryFile(path, buffer);
    } else if (isTauri) {
      throw new Error('todo tauri writeBinary');
    }
  },
  showInFolder: async (path: string): Promise<void> => {
    return (await invoke('fs.show_in_folder', { path }))!;
  },
  showSelectDialog: async (
    options: SelectDialogOptions,
  ): Promise<string | string[] | null | undefined> => {
    return (await invokeAsync('fs.show_select_dialog', options))!;
  },
  saveImageUrlToFile: async (imageUrl: string, filePath: string): Promise<void> => {
    return (await invokeAsync('fs.save_image_url_to_file', {
      imageUrl,
      filePath,
    }))!;
  },
};
