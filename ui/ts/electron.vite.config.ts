import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import path from 'path';
import { UserConfig } from 'vite';

import pkg from './package.json';

export const defaultBuildConfig: UserConfig['build'] = {
  assetsInlineLimit: 0, // 内联base64大小限制
  chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
  reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
};

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: { output: { format: 'es' } },
      ...defaultBuildConfig,
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: { output: { format: 'es' } },
      ...defaultBuildConfig,
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    envPrefix: ['VITE_', 'LONANOTE_'],
    envDir: 'env/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer/src'),
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
    root: 'src/renderer',
    build: {
      ...defaultBuildConfig,
      outDir: 'out/renderer',
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
  },
});
