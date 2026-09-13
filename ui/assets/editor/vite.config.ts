import path from "node:path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    // 本地 link purrmd 时仍统一使用宿主的 CodeMirror/Lezer 实例。
    // 这些库依赖对象身份判断，重复打包会让 EditorState 在 WebView 初始化时直接失败。
    dedupe: [
      "@codemirror/autocomplete",
      "@codemirror/commands",
      "@codemirror/lang-markdown",
      "@codemirror/lang-yaml",
      "@codemirror/language",
      "@codemirror/language-data",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/markdown",
      "@uiw/codemirror-theme-dracula",
      "@uiw/codemirror-theme-vscode",
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    open: false,
  },
});
