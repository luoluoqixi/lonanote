import path from 'path';
import { UserConfig, defineConfig } from 'vite';

import pkg from './package.json';

export const defaultBuildConfig: UserConfig['build'] = {
  assetsInlineLimit: 0, // 内联base64大小限制
  chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
  reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
};

const removeCrossOrigin = () => {
  return {
    name: 'remove-crossorigin-attribute',
    transformIndexHtml(html: string) {
      return html.replace(' type="module" crossorigin ', ' defer ');
    },
  };
};
const outDir = '../../flutter/assets/editor';
export default defineConfig({
  root: './',
  base: './',
  build: {
    outDir,
    minify: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        dir: outDir,
        format: 'iife',
      },
    },
    ...defaultBuildConfig,
  },
  envPrefix: ['VITE_', 'LONANOTE_'],
  envDir: 'env/',
  plugins: [removeCrossOrigin()],
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
    port: 8888,
    open: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
});
