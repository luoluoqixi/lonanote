import path from 'path';
import { defineConfig } from 'vite';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig({
  appType: 'custom',
  build: {
    assetsInlineLimit: 0, // 内联base64大小限制
    chunkSizeWarningLimit: 20000, // 触发警告的chunk大小 (kb)
    reportCompressedSize: false, // gzip压缩大小报告, 禁用提高构建速度
    minify: false,
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      name: 'lonanote-editor',
      fileName: 'index',
    },
  },
  plugins: [
    externalizeDeps({
      // https://github.com/davidmyersdev/vite-plugin-externalize-deps
      deps: false,
      devDeps: true,
      nodeBuiltins: true,
      include: [/@codemirror\/*/],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
