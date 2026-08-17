import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import editorHtmlAsset from "@/assets/editor/dist/index.html";

let cachedEditorHtml: string | null = null;
let loadingEditorHtml: Promise<string> | null = null;

/** 下载并读取编辑器 HTML；成功后在当前应用进程内复用字符串缓存。 */
export function loadEditorHtml(): Promise<string> {
  if (cachedEditorHtml !== null) {
    return Promise.resolve(cachedEditorHtml);
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
        cachedEditorHtml = html;
        return html;
      })
      .finally(() => {
        loadingEditorHtml = null;
      });
  }

  return loadingEditorHtml;
}
