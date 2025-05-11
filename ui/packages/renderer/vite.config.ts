import react from '@vitejs/plugin-react';
import path from 'path';
import { UserConfig, defineConfig } from 'vite';
import { viteVConsole } from 'vite-plugin-vconsole';

import pkg from './package.json';

const tauriDevHost = process.env.TAURI_DEV_HOST;

export const defaultBuildConfig: UserConfig['build'] = {
  assetsInlineLimit: 0, // 内联base64大小限制
  chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
  reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
};

const commonConfig: UserConfig = {
  envPrefix: ['VITE_', 'LONANOTE_'],
  envDir: 'env/',
  plugins: [
    react(),
    viteVConsole({
      entry: path.resolve(__dirname, 'src/index.tsx'),
      enabled: false,
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
    host: tauriDevHost || '0.0.0.0',
    port: 8000,
    open: false,
    hmr: tauriDevHost
      ? {
          protocol: 'ws',
          host: tauriDevHost,
          port: 1421,
        }
      : undefined,
  },
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
  },
};

export const renderer: UserConfig = {
  ...commonConfig,
  root: '../renderer',
  build: {
    ...defaultBuildConfig,
    outDir: 'out/renderer',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  define: {
    ...commonConfig.define,
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
};

export default defineConfig({
  ...renderer,
  root: './',
  build: {
    outDir: 'dist',
    ...defaultBuildConfig,
  },
});
