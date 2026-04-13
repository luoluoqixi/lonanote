import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';

import pkg from './package.json';

export const defaultBuildConfig: UserConfig['build'] = {
  assetsInlineLimit: 0, // 内联base64大小限制
  chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
  reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineConfig(({ command, mode }) => {
  return {
    envPrefix: ['VITE_', 'LONANOTE_'],
    envDir: 'env/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    server: {
      port: 8000,
      open: false,
    },
    root: '.',
    build: {
      ...defaultBuildConfig,
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
  };
});
