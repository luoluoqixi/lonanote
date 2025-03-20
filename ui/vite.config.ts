/* eslint-disable indent */
import react from '@vitejs/plugin-react';
import path from 'path';
import { UserConfig, defineConfig } from 'vite';
import { viteVConsole } from 'vite-plugin-vconsole';

import { preprocess } from './scripts/plugins';

const tauriDevHost = process.env.TAURI_DEV_HOST;

export const defaultBuildConfig: UserConfig['build'] = {
  assetsInlineLimit: 0, // 内联base64大小限制
  chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
  reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
};

export const renderer: UserConfig = {
  root: 'src/renderer',
  build: {
    outDir: 'out/renderer',
    ...defaultBuildConfig,
  },
  envPrefix: ['VITE_', 'LONANOTE_'],
  envDir: 'env/',
  plugins: [
    preprocess({
      copyFiles: [
        {
          from: 'node_modules/vditor',
          to: 'src/renderer/public/libs/vditor',
        },
      ],
    }),
    react(),
    viteVConsole({
      entry: path.resolve(__dirname, 'src/renderer/src/index.tsx'),
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
      '@': path.resolve('src/renderer/src'),
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
};

export default defineConfig(renderer);
