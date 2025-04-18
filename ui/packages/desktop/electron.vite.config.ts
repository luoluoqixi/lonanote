import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

import { defaultBuildConfig, renderer } from '../renderer/vite.config';

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
  renderer,
});
