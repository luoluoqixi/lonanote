import path from 'path';
import { UserConfig, defineConfig } from 'vite';
import { viteVConsole } from 'vite-plugin-vconsole';

import pkg from './package.json';

export const defaultBuildConfig: UserConfig['build'] = {
  assetsInlineLimit: 0, // 内联base64大小限制
  chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
  reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
};

const commonConfig: UserConfig = {
  envPrefix: ['VITE_', 'LONANOTE_'],
  envDir: 'env/',
  plugins: [
    viteVConsole({
      entry: path.resolve(__dirname, 'src/index.tsx'),
      enabled: true,
      localEnabled: false,
      config: {
        log: {
          maxLogNumber: 1000,
          showTimestamps: true,
        },
        theme: 'light',
        onReady() {
          console.log('vConfig init success');
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 或 "modern"，"legacy"
      },
    },
  },
  server: {
    port: 8888,
    open: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
};

export default defineConfig({
  ...commonConfig,
  root: './',
  base: './',
  build: {
    outDir: '../../flutter/assets/editor',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
    ...defaultBuildConfig,
  },
});
