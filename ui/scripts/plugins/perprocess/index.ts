import { merge } from 'ts-deepmerge';
import { Plugin } from 'vite';

import { CopyFileItem, defaultCopyFiles, executeCopyFiles } from './copyFile';

export interface PreProcessOptions {
  copyFiles: CopyFileItem[] | undefined;
}

const defaultOptions: PreProcessOptions = {
  copyFiles: defaultCopyFiles,
};

export function preprocess(options?: Partial<PreProcessOptions>): Plugin {
  const resolvedOptions = merge(defaultOptions, options || {}) as PreProcessOptions;
  return {
    name: 'plugin-preprocess',
    enforce: 'pre',
    configureServer() {},
    async buildStart() {
      this.info('preprocess start');
      try {
        await executeCopyFiles(this, resolvedOptions.copyFiles);
        this.info('preprocess finish');
      } catch (e) {
        this.error(`preprocess error: ${e}`);
      }
    },
  };
}
