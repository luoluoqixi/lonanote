import { useSyncExternalStore } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";

import { fontProbe } from "@/fonts/font_probe";

/** 与真实编辑器相同的 WebView 引擎验证 local()，不通过 bridge 传字体文件。 */
export function FontProbeHost() {
  const probe = useSyncExternalStore(fontProbe.subscribe, fontProbe.getSnapshot);
  if (!probe) return null;
  const config = JSON.stringify(probe).replace(/</g, "\\u003c");
  const html = `<!doctype html><meta charset="utf-8"><script>const probe=${config};Promise.all(probe.font.faces.map(face=>new FontFace(probe.font.family,'local('+JSON.stringify(face.source.name)+')',{weight:String(face.weight),style:face.italic?'italic':'normal'}).load())).then(()=>window.ReactNativeWebView.postMessage(JSON.stringify({id:probe.id}))).catch(()=>window.ReactNativeWebView.postMessage(JSON.stringify({id:probe.id,error:'此字体无法在编辑器中加载'})));</script>`;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
    >
      <WebView
        key={probe.id}
        source={{ html }}
        javaScriptEnabled
        onMessage={(event) => {
          try {
            const result = JSON.parse(event.nativeEvent.data);
            if (result.id === probe.id) fontProbe.finish(result.id, result.error);
          } catch {
            fontProbe.finish(probe.id, "字体验证响应无效");
          }
        }}
        onError={() => fontProbe.finish(probe.id, "字体验证失败")}
      />
    </View>
  );
}
