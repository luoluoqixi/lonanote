/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigationEvent,
} from "react-native-webview/lib/WebViewTypes";

export const onHttpError = (event: WebViewHttpErrorEvent) => {
  const e = event.nativeEvent;
  console.error(
    `[editor_webview] onHttpError: ${e.url}, statusCode: ${e.statusCode}, description: ${e.description}`,
  );
};

export const onError = (event: WebViewErrorEvent) => {
  const e = event.nativeEvent;
  console.error(
    `[editor_webview] onError: ${e.url}, code: ${e.code}, description: ${e.description}`,
  );
};

/**
 * onLoadStart > onLoad > onLoadEnd
 */
export const onLoad = (event: WebViewNavigationEvent) => {
  const e = event.nativeEvent;
  console.log(`[editor_webview] onLoad: ${e.url}, navigationType: ${e.navigationType}`);
};

/**
 * onLoadStart > onLoad > onLoadEnd
 */
export const onLoadStart = (event: WebViewNavigationEvent) => {
  // const e = event.nativeEvent;
  // console.log(`[editor_webview] onLoadStart: ${e.url}, navigationType: ${e.navigationType}`);
};

/**
 * onLoadStart > onLoad > onLoadEnd
 */
export const onLoadEnd = (event: WebViewNavigationEvent | WebViewErrorEvent) => {
  const e = event.nativeEvent;
  if ("navigationType" in e) {
    // console.log(`[editor_webview] onLoadEnd: ${e.url}, navigationType: ${e.navigationType}`);
  } else {
    // console.log(
    //   `[editor_webview] onLoadEnd: ${e.url}, code: ${e.code}, description: ${e.description}`,
    // );
  }
};
