import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import { fastcopy } from '../utils';

export interface CopyFileItem {
  from: string;
  to: string;
  generateMetadataFile?: string;
}

export const defaultCopyFiles: CopyFileItem[] = [];

export interface Context {
  warn: (msg: string) => void;
}

export const executeCopyFiles = async (context: Context, copyFiles: CopyFileItem[] | undefined) => {
  const projectPath = process.cwd();
  copyFiles = copyFiles || defaultCopyFiles;
  for (let i = 0; i < copyFiles.length; i++) {
    const file = copyFiles[i];
    if (file == null) continue;
    const from = path.join(projectPath, file.from);
    const to = path.join(projectPath, file.to);
    try {
      const fileList = await fastcopy(from, to);
      if (file.generateMetadataFile) {
        const metadataPath = path.join(projectPath, file.generateMetadataFile);
        const metadataDir = path.dirname(metadataPath);
        if (!existsSync(metadataDir)) {
          mkdirSync(metadataDir, { recursive: true });
        }
        writeFileSync(metadataPath, JSON.stringify(fileList, undefined, 2), { encoding: 'utf8' });
      }
    } catch (e: any) {
      context.warn(`copy file error: ${e.message}`);
    }
  }
  // 第一次拷贝启动过快可能会加载不到文件
  await new Promise((resolve) => setTimeout(resolve, 300));
};
