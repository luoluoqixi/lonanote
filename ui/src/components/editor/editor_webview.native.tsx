import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";

import { isDev } from "@/api/common/platform";

import { getEditorDevUrl } from "./editor_dev_url";
import { loadEditorHtml } from "./editor_html.native";

export function EditorWebView() {
  const editorDevUrl = isDev() ? getEditorDevUrl() : null;
  const [editorHtml, setEditorHtml] = useState<string | null>(null);
  const [hasLoadingError, setHasLoadingError] = useState(false);

  useEffect(() => {
    if (editorDevUrl) return;

    let isActive = true;

    void loadEditorHtml()
      .then((html) => {
        if (isActive) setEditorHtml(html);
      })
      .catch(() => {
        if (isActive) {
          setHasLoadingError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [editorDevUrl]);

  if (editorDevUrl) {
    return (
      <WebView
        javaScriptEnabled
        originWhitelist={["*"]}
        source={{ uri: editorDevUrl }}
        style={styles.webView}
      />
    );
  }

  if (hasLoadingError) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>编辑器资源加载失败</Text>
      </View>
    );
  }
  if (!editorHtml) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <WebView
      javaScriptEnabled
      originWhitelist={["*"]}
      source={{ html: editorHtml }}
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
