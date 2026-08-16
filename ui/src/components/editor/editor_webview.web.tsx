import type { CSSProperties } from "react";

import editorHtml from "@/assets/editor/editor.html";

const iframeStyle: CSSProperties = {
  border: 0,
  display: "block",
  height: "100%",
  width: "100%",
};

export function EditorWebView() {
  return <iframe aria-label="笔记编辑器" src={editorHtml} style={iframeStyle} title="笔记编辑器" />;
}
