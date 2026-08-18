import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import editorHtmlAsset from "@/assets/editor/dist/index.html";

const cachedEditorHtml = { html: "", inited: false };
let loadingEditorHtml: Promise<void> | null = null;

/** 初始化编辑器 HTML */
export function initEditorHtml(): Promise<void> {
  if (cachedEditorHtml.inited) {
    return Promise.resolve();
  }
  if (loadingEditorHtml === null) {
    loadingEditorHtml = Asset.fromModule(editorHtmlAsset)
      .downloadAsync()
      .then((asset) => {
        if (!asset.localUri) {
          throw new Error("编辑器 HTML asset 未生成本地缓存文件");
        }
        return new File(asset.localUri).text();
      })
      .then((html) => {
        cachedEditorHtml.html = html;
      })
      .finally(() => {
        loadingEditorHtml = null;
      });
  }

  return loadingEditorHtml;
}

export const EDITOR_HTML = cachedEditorHtml;
