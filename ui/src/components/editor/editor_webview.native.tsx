import WebView from "react-native-webview";

import editorHtml from "@/assets/editor/editor.html";

// WebView 的 Windows props 会把 source 收窄为不可能类型；此断言不改变 Metro asset 的运行时值。
const editorSource = editorHtml as never;

export function EditorWebView() {
  return (
    <WebView javaScriptEnabled originWhitelist={["*"]} source={editorSource} style={{ flex: 1 }} />
  );
}
