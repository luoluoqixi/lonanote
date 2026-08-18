import { useHeaderHeight } from "@react-navigation/elements";
import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

import { isDev, isIos } from "@/api/common/platform";

import { getEditorDevUrl } from "./editor_dev_url";
import { EDITOR_HTML, initEditorHtml } from "./editor_html.native";
import { onError, onHttpError, onLoad, onLoadEnd, onLoadStart } from "./editor_webview_event";

function getSource(devMode: boolean) {
  const editorDevUrl = devMode ? getEditorDevUrl() : null;
  return editorDevUrl ? { uri: editorDevUrl } : { html: EDITOR_HTML.html };
}

function RenderLoading() {
  return (
    <View style={styles.statusContainer}>
      <ActivityIndicator />
    </View>
  );
}

export function EditorWebView() {
  const devMode = isDev();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [inited, setInited] = useState<boolean>(false);
  const [hasLoadingError, setHasLoadingError] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!isIos()) return;

    const updateKeyboardHeight = (height: number) => {
      setKeyboardHeight(height);
    };
    const currentKeyboardHeight = Keyboard.metrics()?.height;
    if (currentKeyboardHeight != null) {
      updateKeyboardHeight(currentKeyboardHeight);
    }

    const showSubscription = Keyboard.addListener("keyboardWillShow", (event) => {
      updateKeyboardHeight(event.endCoordinates.height);
    });
    const frameChangeSubscription = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
      updateKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", () => {
      updateKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      frameChangeSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (devMode) return;
    let isActive = true;
    initEditorHtml()
      .then(() => {
        if (isActive) setInited(true);
      })
      .catch(() => {
        if (isActive) {
          setHasLoadingError(true);
        }
      });
    return () => {
      isActive = false;
    };
  }, [devMode]);

  if (hasLoadingError) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>编辑器资源加载失败</Text>
      </View>
    );
  }
  if (!devMode && !inited) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  const source = getSource(devMode);
  return (
    <WebView
      onError={onError}
      onHttpError={onHttpError}
      onLoad={onLoad}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      renderLoading={RenderLoading}
      javaScriptEnabled
      originWhitelist={["*"]}
      scrollIndicatorInsets={
        isIos()
          ? {
              top: headerHeight,
              bottom: Math.max(insets.bottom, keyboardHeight),
            }
          : undefined
      }
      source={source}
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
