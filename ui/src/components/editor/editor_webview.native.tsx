import { Asset } from "expo-asset";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";

import editorHtml from "@/assets/editor/editor.html";

export function EditorWebView() {
  const [editorUri, setEditorUri] = useState<string | null>(null);
  const [hasLoadingError, setHasLoadingError] = useState(false);

  useEffect(() => {
    let isActive = true;

    void Asset.fromModule(editorHtml)
      .downloadAsync()
      .then((asset) => {
        const localUri = asset.localUri ?? asset.uri;

        if (!localUri.startsWith("file://")) {
          throw new Error("编辑器 HTML asset 未解析为本地文件");
        }
        if (isActive) {
          setEditorUri(localUri);
        }
      })
      .catch(() => {
        if (isActive) {
          setHasLoadingError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (hasLoadingError) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>编辑器资源加载失败</Text>
      </View>
    );
  }
  if (!editorUri) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  // WebView 的 Windows props 会把 source 收窄为不可能类型；此断言不改变运行时 source 值。
  const editorSource = { uri: editorUri } as never;

  return (
    <WebView
      allowFileAccess
      javaScriptEnabled
      originWhitelist={["file://*"]}
      source={editorSource}
      style={styles.webView}
    />
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statusText: {
    color: "#6f7177",
  },
  webView: {
    flex: 1,
  },
});
