import type { CSSProperties } from "react";

import { isDev } from "@/api/common/platform";
import editorHtml from "@/assets/editor/dist/index.html";

import { getEditorDevUrl } from "./editor_dev_url";

const iframeStyle: CSSProperties = {
  border: 0,
  display: "block",
  height: "100%",
  width: "100%",
};

export function EditorWebView() {
  const source = isDev() ? (getEditorDevUrl() ?? editorHtml) : editorHtml;
  return <iframe aria-label="编辑器" src={source} style={iframeStyle} title="编辑器" />;
}
